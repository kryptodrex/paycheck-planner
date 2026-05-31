export function getBaseFileName(filePath?: string | null): string | null {
  if (!filePath) return null;

  const normalizedPath = filePath.replace(/[\\/]+$/, '');
  if (!normalizedPath) return null;

  const lastSeparatorIndex = Math.max(normalizedPath.lastIndexOf('/'), normalizedPath.lastIndexOf('\\'));
  const fileName = lastSeparatorIndex >= 0 ? normalizedPath.slice(lastSeparatorIndex + 1) : normalizedPath;
  return fileName || null;
}

export function stripFileExtension(name?: string | null): string | null {
  if (!name) return null;

  const lastDotIndex = name.lastIndexOf('.');
  if (lastDotIndex <= 0) {
    return name;
  }

  return name.slice(0, lastDotIndex);
}

export function getPlanNameFromPath(filePath?: string | null): string | null {
  const fileName = getBaseFileName(filePath);
  const planName = stripFileExtension(fileName);
  const normalized = planName?.trim();
  return normalized || null;
}