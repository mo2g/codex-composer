function escapeRegex(source) {
  return source.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

export function globToRegex(glob) {
  const placeholder = "__DOUBLE_STAR__";
  const escaped = escapeRegex(glob.replace(/\*\*/g, placeholder))
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, "[^/]")
    .replace(new RegExp(placeholder, "g"), ".*");

  return new RegExp(`^${escaped}$`);
}

export function matchesGlob(filePath, glob) {
  return globToRegex(glob).test(filePath);
}

export function matchesAny(filePath, globs) {
  return globs.some((glob) => matchesGlob(filePath, glob));
}
