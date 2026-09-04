export const isMusicRoute = (pathname = '') => (
	pathname === '/music' || pathname.startsWith('/music/')
)

export const shouldShowGlobalMiniPlayer = ({ pathname = '', currentMusic, isPlaying }) => (
	Boolean(currentMusic) && Boolean(isPlaying) && !isMusicRoute(pathname)
)
