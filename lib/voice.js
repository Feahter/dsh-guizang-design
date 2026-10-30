// 个人语料档案的位置：和作品库放在一起，只在本机
import { join } from 'node:path'
import { dataDir } from './library.js'

export const voicePath = () => join(dataDir(), 'voice.md')
