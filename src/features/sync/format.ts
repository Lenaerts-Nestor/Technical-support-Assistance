/** `plural(3, 'link')` → "3 links", `plural(1, 'folder')` → "1 folder". */
export const plural = (n: number, noun: string, many = `${noun}s`) => `${n} ${n === 1 ? noun : many}`
