export const isMusicRoute = (pathname = '') => (
	pathname === '/music' || pathname.startsWith('/music/')
)

export const shouldShowGlobalMiniPlayer = ({ pathname = '', currentMusic, hasPlaybackStarted }) => (
	Boolean(currentMusic)
	&& Boolean(hasPlaybackStarted)
	&& !isMusicRoute(pathname)
	&& pathname !== '/slideshow'
	&& !pathname.startsWith('/slideshow/')
)
