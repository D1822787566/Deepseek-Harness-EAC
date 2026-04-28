/**
 * 共享常量。
 * @module baitong-vision/config
 */

/**
 * 设置命名空间。用无连字符的单词（yaml key / schemastery 注册更稳妥），
 * 与插件 id（baitong-vision）刻意区分。
 */
export const NS = 'baitongvision';

/** 文本模型扫描结果缓存（独立文件，不干扰 settings.yaml）。 */
export { MODELS_CACHE } from './models-cache.js';
