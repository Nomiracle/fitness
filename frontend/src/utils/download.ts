/** 下载 / 读取本地 JSON（导出备份、导入备份） */

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function readJsonFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => {
      try {
        resolve(JSON.parse(String(r.result)))
      } catch (e) {
        reject(e)
      }
    }
    r.onerror = () => reject(r.error)
    r.readAsText(file)
  })
}
