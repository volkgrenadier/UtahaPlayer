import React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import MiniPlayer from './MiniPlayer';

let mockPlayback;
jest.mock('../../context/MusicPlayerContext', () => ({
    useMusicPlayer: () => mockPlayback
}));

const TestPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    return (
        <>
            <MiniPlayer />
            <button type="button" onClick={() => navigate('/photo')}>打开图片页</button>
            <output data-testid="route">{location.pathname}</output>
        </>
    );
};

const createPage = () => (
    <MemoryRouter initialEntries={['/']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <TestPage />
    </MemoryRouter>
);
const advance = (milliseconds) => act(() => jest.advanceTimersByTime(milliseconds));
const player = () => screen.getByRole('region', { name: '全局音乐播放器' });

describe('floating global player', () => {
    let user;
    beforeEach(() => {
        jest.useFakeTimers();
        user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
        mockPlayback = {
            currentMusic: { id: 'first', title: '晚风与回声', artist: 'Utaha Sessions', coverUrl: 'blob:cover' },
            isPlaying: true, isMuted: false, currentTime: 102, totalTime: 248, progress: 41, volumeLevel: 25,
            togglePlay: jest.fn(), playPrevious: jest.fn(), playNext: jest.fn(),
            seekToProgress: jest.fn(), applyVolume: jest.fn(), toggleMute: jest.fn()
        };
    });
    afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    test('starts collapsed and excludes hidden controls from the keyboard sequence', async () => {
        render(createPage());
        expect(within(player()).getAllByRole('button')).toHaveLength(2);
        expect(screen.queryByRole('slider')).not.toBeInTheDocument();
        await user.tab();
        expect(screen.getByRole('button', { name: '暂停唱片播放' })).toHaveFocus();
        await user.tab();
        expect(screen.getByRole('button', { name: '展开播放器' })).toHaveFocus();
        await user.tab();
        expect(screen.getByRole('button', { name: '打开图片页' })).toHaveFocus();
    });

    test('click, Enter and Space each toggle once without navigation', async () => {
        const { rerender } = render(createPage());
        const record = screen.getByRole('button', { name: '暂停唱片播放' });
        const rotatingFace = screen.getByTestId('floating-vinyl-record');
        expect(within(record).getByTestId('PauseIcon')).toBeInTheDocument();
        await user.click(record);
        expect(mockPlayback.togglePlay).toHaveBeenCalledTimes(1);
        await user.keyboard('{Enter}');
        expect(mockPlayback.togglePlay).toHaveBeenCalledTimes(2);
        await user.keyboard(' ');
        expect(mockPlayback.togglePlay).toHaveBeenCalledTimes(3);
        expect(screen.getByTestId('route')).toHaveTextContent('/');
        mockPlayback = { ...mockPlayback, isPlaying: false };
        rerender(createPage());
        const pausedRecord = screen.getByRole('button', { name: '开始唱片播放' });
        expect(within(pausedRecord).getByTestId('PlayArrowIcon')).toBeInTheDocument();
        expect(pausedRecord).not.toHaveClass('is-playing');
        expect(screen.getByTestId('floating-vinyl-record')).toBe(rotatingFace);
    });

    test('falls back on cover errors and retries when the artwork changes', () => {
        const { rerender } = render(createPage());
        const record = screen.getByRole('button', { name: '暂停唱片播放' });
        fireEvent.error(screen.getByTestId('floating-vinyl-cover'));
        expect(screen.queryByTestId('floating-vinyl-cover')).not.toBeInTheDocument();
        expect(within(record).getByText('U')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '展开播放器' })).toBeEnabled();
        mockPlayback.currentMusic = { ...mockPlayback.currentMusic, coverUrl: 'blob:second' };
        rerender(createPage());
        expect(screen.getByTestId('floating-vinyl-cover')).toHaveAttribute('src', 'blob:second');
        mockPlayback.currentMusic = { ...mockPlayback.currentMusic, coverUrl: null, thumbnailUrl: 'blob:thumb' };
        rerender(createPage());
        expect(screen.getByTestId('floating-vinyl-cover')).toHaveAttribute('src', 'blob:thumb');
        mockPlayback.currentMusic = { id: 'no-cover', title: '无封面歌曲' };
        rerender(createPage());
        expect(screen.queryByTestId('floating-vinyl-cover')).not.toBeInTheDocument();
        expect(within(record).getByText('U')).toBeInTheDocument();
    });

    test('routes only through song information and retains every existing control', async () => {
        render(createPage());
        await user.click(screen.getByRole('button', { name: '展开播放器' }));
        const panel = screen.getByRole('group', { name: '播放控制' });
        expect(panel).not.toHaveAttribute('inert');
        await user.click(panel);
        await user.click(screen.getByRole('button', { name: '上一首' }));
        await user.click(screen.getByRole('button', { name: '暂停', exact: true }));
        await user.click(screen.getByRole('button', { name: '下一首' }));
        await user.click(screen.getByRole('button', { name: '静音', exact: true }));
        fireEvent.change(screen.getByRole('slider', { name: '音乐播放进度' }), { target: { value: '65.5' } });
        expect(mockPlayback.playPrevious).toHaveBeenCalledTimes(1);
        expect(mockPlayback.playNext).toHaveBeenCalledTimes(1);
        expect(mockPlayback.togglePlay).toHaveBeenCalledTimes(1);
        expect(mockPlayback.toggleMute).toHaveBeenCalledTimes(1);
        expect(mockPlayback.seekToProgress).toHaveBeenCalledWith('65.5');
        expect(screen.getByTestId('route')).toHaveTextContent(/^\/$/);
        await user.click(screen.getByRole('button', { name: '在音乐页查看当前歌曲' }));
        expect(screen.getByTestId('route')).toHaveTextContent('/music');
    });

    test('collapses three seconds after leaving, even with mouse-origin focus', async () => {
        render(createPage());
        await user.click(screen.getByRole('button', { name: '展开播放器' }));
        await user.unhover(player());
        advance(2999);
        expect(screen.getByRole('button', { name: '收起播放器' })).toBeInTheDocument();
        advance(1);
        expect(screen.getByRole('button', { name: '展开播放器' })).toBeInTheDocument();
        expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    });

    test('re-entering cancels the countdown; unrelated outside clicks do not reset it', async () => {
        render(createPage());
        await user.click(screen.getByRole('button', { name: '展开播放器' }));
        await user.unhover(player());
        advance(2000);
        await user.hover(player());
        advance(5000);
        expect(screen.getByRole('button', { name: '收起播放器' })).toBeInTheDocument();
        await user.unhover(player());
        advance(2000);
        fireEvent.pointerUp(document.body);
        advance(1000);
        expect(screen.getByRole('button', { name: '展开播放器' })).toBeInTheDocument();
    });

    test('keyboard focus entered from outside protects the tile until focus leaves', async () => {
        render(createPage());
        await user.click(screen.getByRole('button', { name: '展开播放器' }));
        await user.unhover(player());
        act(() => screen.getByRole('button', { name: '打开图片页' }).focus());
        await user.tab({ shift: true });
        expect(screen.getByRole('slider', { name: '音乐音量' })).toHaveFocus();
        advance(6000);
        expect(screen.getByRole('button', { name: '收起播放器' })).toBeInTheDocument();
        await user.tab();
        advance(3000);
        expect(screen.getByRole('button', { name: '展开播放器' })).toBeInTheDocument();
    });

    test.each(['pointerUp', 'pointerCancel'])('protects slider dragging outside the tile until %s and persists volume once', async (release) => {
        const { rerender } = render(createPage());
        await user.click(screen.getByRole('button', { name: '展开播放器' }));
        const volume = screen.getByRole('slider', { name: '音乐音量' });
        fireEvent.pointerDown(volume);
        fireEvent.change(volume, { target: { value: '70' } });
        mockPlayback.volumeLevel = 70;
        rerender(createPage());
        await user.unhover(player());
        advance(5000);
        expect(volume).toBeEnabled();
        fireEvent[release](window);
        expect(mockPlayback.applyVolume).toHaveBeenCalledWith('70');
        expect(mockPlayback.applyVolume).toHaveBeenLastCalledWith('70', { persist: true });
        expect(mockPlayback.applyVolume.mock.calls.filter((call) => call[1]?.persist)).toHaveLength(1);
        advance(3000);
        expect(screen.getByRole('button', { name: '展开播放器' })).toBeInTheDocument();
    });

    test('protects a progress drag, then releases it when the window loses focus', async () => {
        render(createPage());
        await user.click(screen.getByRole('button', { name: '展开播放器' }));
        fireEvent.pointerDown(screen.getByRole('slider', { name: '音乐播放进度' }));
        await user.unhover(player());
        advance(5000);
        expect(screen.getByRole('button', { name: '收起播放器' })).toBeInTheDocument();
        fireEvent.blur(window);
        advance(3000);
        expect(screen.getByRole('button', { name: '展开播放器' })).toBeInTheDocument();
    });

    test('Escape hides controls and restores focus; keyboard volume changes persist', async () => {
        const { rerender } = render(createPage());
        await user.tab();
        await user.tab();
        await user.keyboard('{Enter}');
        const volume = screen.getByRole('slider', { name: '音乐音量' });
        act(() => volume.focus());
        const panel = screen.getByRole('group', { name: '播放控制' });
        fireEvent.change(volume, { target: { value: '45' } });
        mockPlayback.volumeLevel = 45;
        rerender(createPage());
        await user.keyboard('{ArrowRight}');
        expect(mockPlayback.applyVolume).toHaveBeenLastCalledWith('45', { persist: true });
        await user.keyboard('{Escape}');
        expect(screen.getByRole('button', { name: '展开播放器' })).toHaveFocus();
        expect(volume).toBeDisabled();
        expect(panel).toHaveAttribute('inert');
        await user.tab();
        expect(screen.getByRole('button', { name: '打开图片页' })).toHaveFocus();
    });

    test('route changes reset expansion and unmount cancels pending timers', async () => {
        const { unmount } = render(createPage());
        await user.click(screen.getByRole('button', { name: '展开播放器' }));
        await user.click(screen.getByRole('button', { name: '打开图片页' }));
        expect(screen.getByRole('button', { name: '展开播放器' })).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: '展开播放器' }));
        await user.unhover(player());
        expect(jest.getTimerCount()).toBe(1);
        unmount();
        expect(jest.getTimerCount()).toBe(0);
    });

    test('unknown duration disables seeking and renders safe time values', async () => {
        mockPlayback.totalTime = NaN;
        mockPlayback.currentTime = NaN;
        mockPlayback.progress = NaN;
        render(createPage());
        await user.click(screen.getByRole('button', { name: '展开播放器' }));
        expect(screen.getByRole('slider', { name: '音乐播放进度' })).toBeDisabled();
        expect(screen.getAllByText('0:00')).toHaveLength(2);
    });
});
