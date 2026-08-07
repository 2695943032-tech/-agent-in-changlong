const DB_NAME = 'chimelong-journey-media'
const DB_VERSION = 1
const STORE_NAME = 'blobs'

function openDatabase(): Promise<IDBDatabase> {
  if (!import.meta.client || !('indexedDB' in window)) return Promise.reject(new Error('当前浏览器不支持本地媒体存储'))
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('无法打开媒体存储'))
  })
}

async function runTransaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await openDatabase()
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode)
      const request = action(transaction.objectStore(STORE_NAME))
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error('媒体存储操作失败'))
    })
  }
  finally {
    database.close()
  }
}

export async function saveJourneyBlob(storageKey: string, blob: Blob) {
  await runTransaction('readwrite', store => store.put(blob, storageKey))
  return storageKey
}

export async function readJourneyBlob(storageKey: string) {
  return await runTransaction<Blob | undefined>('readonly', store => store.get(storageKey))
}

export async function deleteJourneyBlob(storageKey: string) {
  await runTransaction('readwrite', store => store.delete(storageKey))
}

export async function compressJourneyPhoto(file: File, maxSide = 1920, quality = 0.84): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file
  const bitmap = await createImageBitmap(file)
  const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * ratio))
  canvas.height = Math.max(1, Math.round(bitmap.height * ratio))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('当前设备无法压缩照片')
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return await new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('照片压缩失败')), 'image/webp', quality)
  })
}

