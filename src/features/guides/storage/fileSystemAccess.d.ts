/**
 * Ambient fill-ins for the parts of the File System Access API that this
 * project's TypeScript `lib.dom` does not yet type: `window.showDirectoryPicker`
 * and the permission methods on a handle. Everything else
 * (`FileSystemDirectoryHandle`, `getFileHandle`, `createWritable`, …) is already
 * in `lib.dom.d.ts`.
 */
export {}

declare global {
  type FileSystemPermissionMode = 'read' | 'readwrite'

  interface FileSystemHandlePermissionDescriptor {
    mode?: FileSystemPermissionMode
  }

  interface FileSystemHandle {
    queryPermission(
      descriptor?: FileSystemHandlePermissionDescriptor,
    ): Promise<PermissionState>
    requestPermission(
      descriptor?: FileSystemHandlePermissionDescriptor,
    ): Promise<PermissionState>
  }

  interface FileSystemDirectoryHandle {
    /** Union-typed so `kind` narrows to the file / directory handle. */
    entries(): AsyncIterableIterator<
      [string, FileSystemFileHandle | FileSystemDirectoryHandle]
    >
    /** Path segments from this directory down to `handle`, or null if outside it. */
    resolve(handle: FileSystemHandle): Promise<string[] | null>
  }

  type WellKnownDirectory =
    | 'desktop'
    | 'documents'
    | 'downloads'
    | 'music'
    | 'pictures'
    | 'videos'

  interface DirectoryPickerOptions {
    id?: string
    mode?: FileSystemPermissionMode
    startIn?: FileSystemHandle | WellKnownDirectory
  }

  interface OpenFilePickerOptions {
    id?: string
    multiple?: boolean
    excludeAcceptAllOption?: boolean
    startIn?: FileSystemHandle | WellKnownDirectory
    types?: { description?: string; accept: Record<string, string[]> }[]
  }

  interface Window {
    showDirectoryPicker(
      options?: DirectoryPickerOptions,
    ): Promise<FileSystemDirectoryHandle>
    showOpenFilePicker(
      options?: OpenFilePickerOptions,
    ): Promise<FileSystemFileHandle[]>
  }
}
