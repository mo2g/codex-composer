function stripComments(line) {
  let result = "";
  let inString = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const previous = line[index - 1];

    if (char === "\"" && previous !== "\\") {
      inString = !inString;
    }

    if (char === "#" && !inString) {
      break;
    }

    result += char;
  }

  return result.trim();
}

function parsePrimitive(raw) {
  const value = raw.trim();

  if (value.startsWith("\"") && value.endsWith("\"")) {
    return value.slice(1, -1).replace(/\\"/g, "\"");
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  if (/^-?\d+$/.test(value)) {
    return Number.parseInt(value, 10);
  }

  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (!inner) {
      return [];
    }

    const items = [];
    let current = "";
    let inString = false;

    for (let index = 0; index < inner.length; index += 1) {
      const char = inner[index];
      const previous = inner[index - 1];

      if (char === "\"" && previous !== "\\") {
        inString = !inString;
      }

      if (char === "," && !inString) {
        items.push(parsePrimitive(current));
        current = "";
        continue;
      }

      current += char;
    }

    if (current.trim()) {
      items.push(parsePrimitive(current));
    }

    return items;
  }

  return value;
}

function ensureNested(root, keys) {
  let cursor = root;

  for (const key of keys) {
    if (!(key in cursor)) {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }

  return cursor;
}

function bracketBalance(value) {
  let balance = 0;
  let inString = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const previous = value[index - 1];

    if (char === "\"" && previous !== "\\") {
      inString = !inString;
    }

    if (inString) {
      continue;
    }

    if (char === "[") {
      balance += 1;
    } else if (char === "]") {
      balance -= 1;
    }
  }

  return balance;
}

export function parseToml(source) {
  const result = {};
  let current = result;
  const rawLines = source.split(/\r?\n/);

  for (let index = 0; index < rawLines.length; index += 1) {
    const rawLine = rawLines[index];
    let line = stripComments(rawLine);

    if (!line) {
      continue;
    }

    const separator = line.indexOf("=");
    if (separator !== -1) {
      const value = line.slice(separator + 1).trim();
      if (value.startsWith("[") && bracketBalance(value) > 0) {
        while (index + 1 < rawLines.length && bracketBalance(line.slice(separator + 1).trim()) > 0) {
          index += 1;
          const continuation = stripComments(rawLines[index]);
          if (!continuation) {
            continue;
          }
          line = `${line} ${continuation}`;
        }
      }
    }

    if (line.startsWith("[[") && line.endsWith("]]")) {
      const keyPath = line.slice(2, -2).trim().split(".");
      const parentKeys = keyPath.slice(0, -1);
      const arrayKey = keyPath[keyPath.length - 1];
      const parent = ensureNested(result, parentKeys);
      parent[arrayKey] ||= [];
      parent[arrayKey].push({});
      current = parent[arrayKey][parent[arrayKey].length - 1];
      continue;
    }

    if (line.startsWith("[") && line.endsWith("]")) {
      const keyPath = line.slice(1, -1).trim().split(".");
      current = ensureNested(result, keyPath);
      continue;
    }

    if (separator === -1) {
      throw new Error(`Invalid TOML line: ${line}`);
    }

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    current[key] = parsePrimitive(value);
  }

  return result;
}
