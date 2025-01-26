import { createCanvas, formatTime } from './tools';
import { NScheduleBackend } from './database';

export async function generateImage(location_name: NScheduleBackend['LocationName'], route_name: NScheduleBackend['RouteName'], direction: NScheduleBackend['Direction'], time: number, time_formatting_mode: NScheduleBackend['TimeFormattingMode']): Promise<ArrayBuffer> {
  const width = 1280;
  const height = 640;

  const card_padding = 75;

  const attribute_padding = 50;
  const attribute_icon_width = 33;
  const attribute_icon_height = 33;

  const fontFamily = `"Ubuntu", serif`;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // draw background
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);

  // draw estimate time
  ctx.fillStyle = '#000';
  ctx.font = `800 120px ${fontFamily}`;
  ctx.textBaseline = 'top';
  ctx.fillText(formatTime(time, time_formatting_mode), card_padding, card_padding, width - card_padding * 2);
  const attributes = [
    {
      value: route_name,
      name: '路線',
      icon_path: 'route.png'
    },
    {
      value: direction,
      name: '方向',
      icon_path: 'direction.png'
    },
    {
      value: location_name,
      name: '地點',
      icon_path: 'location.png'
    }
  ];

  let offsetX = 0;
  for (const attribute of attributes) {
    // draw icon
    ctx.fillRect(offsetX + card_padding, height - card_padding - attribute_icon_height, attribute_icon_width, attribute_icon_height);
    // TODO: use real icon

    // draw name
    ctx.fillStyle = '#000';
    ctx.font = `500 30px ${fontFamily}`;
    ctx.textBaseline = 'top';
    const nameWidth = ctx.measureText(attribute.name).width;
    ctx.fillText(attribute.name, offsetX + card_padding + attribute_icon_width, height - card_padding - attribute_icon_height, nameWidth);

    // draw value
    ctx.fillStyle = '#000';
    ctx.font = `500 48px ${fontFamily}`;
    ctx.textBaseline = 'top';
    const valueSize = ctx.measureText(attribute.value);
    const valueWidth = valueSize.width;
    const valueHeight = valueSize.emHeightDescent;
    ctx.fillText(attribute.value, offsetX + card_padding, height - card_padding - attribute_icon_height - valueHeight, valueWidth);
    offsetX += Math.max(nameWidth + attribute_icon_width, valueWidth) + attribute_padding;
  }

  const buffer = await new Promise((resolve, reject) => {
    canvas.toBuffer((err, buf) => {
      if (err) {
        reject(err);
      } else {
        resolve(buf);
      }
    });
  });
  return buffer;
}
