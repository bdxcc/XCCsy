/* eslint-disable no-console */
import fs from 'fs';
import os from 'os';
import path from 'path';
import zlib from 'zlib';

import tar from 'tar';

import { usePromise } from '../common/utils';

const platform = os.platform();
const __dirname = path.parse(import.meta.url.slice(platform === 'win32' ? 8 : 7)).dir;
const WindowsExifToolPath = path.join(__dirname, '../static/windows-exiftool.zip');
const CommondExifToolPath = path.join(__dirname, '../static/commond-exiftool.tar.gz');

export default async (outPath: string) => {
  const [promise, r] = usePromise();
  const outDir = path.join(outPath, 'exiftool');
  const exiftoolCommodPath = path.join(outDir, 'exiftool');

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir);
  }

  if (fs.existsSync(exiftoolCommodPath)) {
    r(true);
    return promise;
  }

  const exiftoolPath = platform === 'win32' ? WindowsExifToolPath : CommondExifToolPath;
  fs.createReadStream(exiftoolPath)
    .pipe(platform === 'win32' ? zlib.createUnzip() : zlib.createGunzip())
    .on('error', (e) => {
      console.log('Exiftool模块解压异常', e);
      r(false);
    })
    .pipe(
      platform === 'darwin'
        ? tar.extract({ cwd: outDir })
        : fs.createWriteStream(exiftoolCommodPath),
    )
    .on('finish', () => {
      console.log('Exiftool工具解压完成');

      // mac的压缩包套了一层文件夹，需要将文件夹的内容全部复制到上一层
      const fileList = fs.readdirSync(outDir);
      if (fileList.length === 1) {
        const filePath = path.join(outDir, fileList[0]);
        if (fs.statSync(filePath)?.isDirectory()) {
          cpDirAllFile(filePath, outDir);
        }
      }

      r(true);
    });

  return promise;
};

function cpDirAllFile(origin: string, target: string) {
  if (!fs.statSync(origin).isDirectory()) return;

  const fileList = fs.readdirSync(origin);

  for (const file of fileList) {
    const originFilePath = path.join(origin, file);
    const targetFilePath = path.join(target, file);

    if (fs.statSync(originFilePath).isDirectory()) {
      fs.cpSync(originFilePath, targetFilePath, { recursive: true });
    } else {
      fs.copyFileSync(originFilePath, targetFilePath);
    }
  }

  fs.rmSync(origin, { recursive: true });
}