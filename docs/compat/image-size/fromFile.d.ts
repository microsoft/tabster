/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export declare function imageSizeFromFile(filePath: string): Promise<{
    width: number;
    height: number;
    type: "png";
}>;
