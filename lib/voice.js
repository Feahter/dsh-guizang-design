// 个人语料档案的位置：和作品库放在一起，只在本机
import { join } from 'node:path'
import { dataDir } from './library.js'

export const voicePath = () => join(dataDir(), 'voice.md')
// 从 DSH 聊天记录整理出来的学习素材（用户发过的消息），guizang-voice 读它建档
export const corpusPath = () => join(dataDir(), 'voice-corpus.md')
