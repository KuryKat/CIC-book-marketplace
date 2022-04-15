/**
 * Encodes a string in a colour
 */
enum Colors {
  // RGB in this "color table"
  // "\x1B[38;2;R;G;Bm"
  // Example:
  lightgreen = '\x1B[38;2;0;255;0m',
  gold = '\x1B[38;2;255;215;0m',
  niceRed = '\x1B[38;2;255;0;0m',

  BOLD = '\x1B[1m',

  red = '\x1B[31m',
  green = '\x1B[32m',
  blue = '\x1b[34m',

  yellow = '\x1B[33m',
  magenta = '\x1b[35m',
  cyan = '\x1b[36m',
  white = '\x1b[37m',
  black = '\x1B[39m'
}

const reStr = Object.values(Colors).join('|')
const re = new RegExp(('(' + reStr + ')').replace(/\[/g, '\\['), 'g')

const Colorize = {
  colour (c: keyof typeof Colors, str: string): string {
    return Colors[c ?? 'black'] + str + Colors.black
  },
  strip (str: string): string {
    re.lastIndex = 0 // reset position
    return str.replace(re, '')
  }
}

export { Colorize }
