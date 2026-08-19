const IGNORED_NAMES = new Set([".ds_store", "thumbs.db", "desktop.ini"]);

const isIgnored = (name: string) => IGNORED_NAMES.has(name.toLowerCase());

const readAllEntries = (reader: FileSystemDirectoryReader) =>
  new Promise<FileSystemEntry[]>((resolve, reject) => {
    const entries: FileSystemEntry[] = [];

    const readBatch = () => {
      reader.readEntries((batch) => {
        if (batch.length === 0) {
          resolve(entries);
          return;
        }

        entries.push(...batch);
        readBatch();
      }, reject);
    };

    readBatch();
  });

const fileFromEntry = (entry: FileSystemFileEntry) =>
  new Promise<File | null>((resolve) => {
    entry.file(resolve, () => resolve(null));
  });

const filesFromEntry = async (entry: FileSystemEntry): Promise<File[]> => {
  if (isIgnored(entry.name)) {
    return [];
  }

  if (entry.isFile) {
    const file = await fileFromEntry(entry as FileSystemFileEntry);
    return file ? [file] : [];
  }

  if (!entry.isDirectory) {
    return [];
  }

  const children = await readAllEntries(
    (entry as FileSystemDirectoryEntry).createReader(),
  );
  const nested = await Promise.all(children.map(filesFromEntry));
  return nested.flat();
};

export const filesFromDataTransfer = async (data: DataTransfer) => {
  const items = [...data.items].filter((item) => item.kind === "file");

  if (items.length === 0) {
    return [...data.files].filter((file) => !isIgnored(file.name));
  }

  const collected = await Promise.all(
    items.map(async (item) => {
      const entry = item.webkitGetAsEntry?.() ?? null;
      if (entry) {
        return filesFromEntry(entry);
      }

      const file = item.getAsFile();
      if (!file || isIgnored(file.name)) {
        return [];
      }

      return [file];
    }),
  );

  return collected.flat();
};

export const dataTransferHasFiles = (data: DataTransfer | null) =>
  Boolean(data?.types.includes("Files"));
