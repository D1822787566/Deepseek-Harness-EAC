/** 模型扫描结果存储路径（独立文件，不干扰 settings.yaml 的用户配置）。 */
import { join } from 'node:path';
import { homedir } from 'node:os';

export const MODELS_CACHE = join(homedir(), '.dsh', 'baitong-vision-models.json');
