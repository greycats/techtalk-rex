//@flow

import type { SearchFieldOption } from '../redis-utils-1'

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

export const OPTIONS: { [key: string]: SearchFieldOption } = {
  oss_name: {
    tokenize: true
  },
  uploader: {
    tokenize: true
  },
  tags: {
    tokenize: true
  },
  description: {
    tokenize: true
  }
}

export const db = 10
