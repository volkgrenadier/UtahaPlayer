// 点击复制
export const clickCopy = (e, cb) => {
	const text = e.target.innerText;
	window.navigator.clipboard.writeText(text)
	.then(() => {
		if (!cb || typeof cb !== 'function') {
			return
		}
		cb('已复制至剪贴板')
	})
}