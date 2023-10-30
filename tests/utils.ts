import { gunzipSync } from "zlib";
import * as fs from "fs";
import path from "path";

interface ApiResponse {
  scope: string;
  method: string;
  path: string;
  body: object;
  status: number;
  response: string[];
  rawHeaders?: string[];
  responseIsBinary?: boolean;
}

export function decompressResponse(data: ApiResponse[]): ApiResponse[] {
  return data.map((item) => {
    const buffer = Buffer.from(item.response.join(""), "hex");
    const decompressedData = gunzipSync(buffer).toString("utf8");
    item.response = [JSON.parse(decompressedData)];
    return item;
  });
}

export async function decompressCassettes(directory: string): Promise<void> {
  const files = fs.readdirSync(directory);

  for (const file of files) {
    const filePath = path.join(directory, file);
    const fileContent = fs.readFileSync(filePath, "utf8");
    const jsonData: ApiResponse[] = JSON.parse(fileContent);
    const decompressedData = decompressResponse(jsonData);
    decompressedData.forEach(function (item) {
      delete item.rawHeaders;
    });
    fs.writeFileSync(filePath, JSON.stringify(decompressedData), "utf8");
  }
}
