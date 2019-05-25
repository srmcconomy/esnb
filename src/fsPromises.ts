import * as fs from 'fs';

export function readFile(filename: string): Promise<string | null> {
  return new Promise((res, rej) => {
    fs.readFile(filename, 'utf-8', (err, data) => {
      if (err) {
        if (err.code === 'ENOENT') {
          res(null);
        } else {
          rej(err);
        }
      } else {
        res(data);
      }
    });
  });
}

export function writeFile(filename: string, data: string): Promise<void> {
  return new Promise((res, rej) => {
    fs.writeFile(filename, data, err => {
      if (err) {
        rej(err);
      } else {
        res();
      }
    });
  });
}
