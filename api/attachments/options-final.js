//@flow

import type { SearchFieldOption } from '../redis-utils-final'

export type Attachment = {
  oss_name: string,
  updated_at: string,
  size: number,
  type: string,
  uploader?: string,
  uploader_id?: number,
  description: string|null,
  tags: string[]|null
}

const Types = ['audio', 'image', 'powerpoint', 'video']

export const OPTIONS: { [key: string]: SearchFieldOption } = {
  oss_name: {
    tokenize: true,
    score: (s: string) => scoreOfText(s.substr(0, 2)),
    isDefault: true
  },
  updated_at: {
    score: (s: string) => new Date(s).getTime() / 1000,
  },
  uploader: {
    score: 'uploader_id',
    filter: true,
    tokenize: true
  },
  type: {
    score: (s: string) => Types.indexOf(s) + 1,
    filter: true
  },
  tags: {
    tokenize: true
  },
  description: {
    tokenize: true
  }
}

const gap = 0x9FA5 - 0x4E00 + 0x7A - 0x30
const hanzi_base = 0x4E00 - 0x7A + 0x30

const scoreOfText = (text: string): number => {
  const last = text.length - 1
  return text.split('').map(char => {
    const code = char.charCodeAt(0)
    if (!code) {
      return 0
    } else if (code >= 0x4E00) {
      return code - hanzi_base
    } else {
      return code - 0x30
    }
  }).reduce((sum, code) => sum * gap + code, 0) || 0
}

export const db = 10
