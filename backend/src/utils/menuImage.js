const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

// Only raster formats; never accept SVG/HTML or user-controlled filesystem paths.
function validateMenuImage(value) {
  if (value === '') return { image: '' };
  if (typeof value !== 'string') return { error: 'Ảnh món không hợp lệ' };
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4) return { error: 'Chỉ nhận ảnh JPG, PNG, WebP tối đa 2 MB' };
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES || bytes.toString('base64') !== match[2]) return { error: 'Dữ liệu ảnh không hợp lệ' };
  const valid = match[1] === 'jpeg' ? bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
    : match[1] === 'png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  return valid ? { image: value } : { error: 'Nội dung tệp không khớp định dạng ảnh' };
}
module.exports = { validateMenuImage, MAX_IMAGE_BYTES };
