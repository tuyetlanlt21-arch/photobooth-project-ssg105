export const PHOTO_COUNT = 4;
const base = '/assets/frames/';
const makeFrame = (id, name, file, slots, canvas = { width: 880, height: 2650 }) => ({
  id, name, src: `${base}${file}`, thumbnail: `${base}${file}`, canvas, slots
});

export const FRAME_LIST = [
  makeFrame('shinchan', 'Shinchan', '01-shinchan.png', [
    { x: 63, y: 71, width: 754, height: 549 },
    { x: 64, y: 684, width: 754, height: 549 },
    { x: 64, y: 1295, width: 754, height: 549 },
    { x: 63, y: 1916, width: 754, height: 549 }
  ]),
  makeFrame('photoxinhh', 'Photoxinhh', '02-photoxinhh.png', [
    { x: 55, y: 64, width: 770, height: 565 },
    { x: 55, y: 676, width: 770, height: 565 },
    { x: 57, y: 1289, width: 769, height: 564 },
    { x: 55, y: 1901, width: 770, height: 564 }
  ]),
  makeFrame('photoxinhh-dark', 'Photoxinhh Dark', '03-photoxinhh-dark.png', [
    { x: 55, y: 64, width: 770, height: 564 },
    { x: 55, y: 676, width: 770, height: 565 },
    { x: 57, y: 1289, width: 769, height: 564 },
    { x: 55, y: 1901, width: 770, height: 564 }
  ]),
  makeFrame('photoxinhh-red', 'Photoxinhh Red', '04-photoxinhh-red.png', [
    { x: 55, y: 64, width: 770, height: 564 },
    { x: 55, y: 676, width: 770, height: 565 },
    { x: 57, y: 1289, width: 769, height: 564 },
    { x: 55, y: 1901, width: 770, height: 564 }
  ]),
  makeFrame('pink-bows', 'Pink Bows', '05-pink-bows.png', [
    { x: 55, y: 64, width: 770, height: 565 },
    { x: 55, y: 676, width: 770, height: 565 },
    { x: 56, y: 1289, width: 770, height: 564 },
    { x: 55, y: 1901, width: 770, height: 564 }
  ]),
  makeFrame('vietnam', 'Vietnam', '06-vietnam.png', [
    { x: 56, y: 63, width: 770, height: 565 },
    { x: 56, y: 670, width: 770, height: 577 },
    { x: 56, y: 1289, width: 770, height: 572 },
    { x: 56, y: 1904, width: 770, height: 568 }
  ]),
  makeFrame('instagram', 'Instagram', '07-instagram.png', [
    { x: 53, y: 52, width: 768, height: 559 },
    { x: 55, y: 668, width: 767, height: 560 },
    { x: 55, y: 1283, width: 767, height: 559 },
    { x: 53, y: 1908, width: 768, height: 559 }
  ]),
  makeFrame('independence', 'Độc Lập', '08-independence.png', [
    { x: 34, y: 34, width: 431, height: 305 },
    { x: 34, y: 375, width: 431, height: 304 },
    { x: 34, y: 715, width: 431, height: 305 },
    { x: 34, y: 1056, width: 431, height: 305 }
  ], { width: 500, height: 1500 }),
  makeFrame('vietnam-heritage', 'Di Sản Việt', '09-vietnam-heritage.png', [
    { x: 29, y: 33, width: 442, height: 320 },
    { x: 31, y: 378, width: 440, height: 287 },
    { x: 31, y: 689, width: 440, height: 287 },
    { x: 31, y: 1003, width: 440, height: 287 }
  ], { width: 500, height: 1500 }),
  makeFrame('doc-lap-tu-hao', 'Tự Hào', '10-doc-lap-tu-hao.png', [
    { x: 36, y: 31, width: 430, height: 304 },
    { x: 36, y: 371, width: 430, height: 305 },
    { x: 36, y: 712, width: 430, height: 304 },
    { x: 36, y: 1053, width: 430, height: 305 }
  ], { width: 500, height: 1500 }),
  makeFrame('be-kind', 'Be Kind', '11-be-kind.png', [
    { x: 55, y: 65, width: 770, height: 564 },
    { x: 57, y: 676, width: 769, height: 565 },
    { x: 61, y: 1288, width: 769, height: 564 },
    { x: 57, y: 1899, width: 769, height: 564 }
  ])
];

export const getFrameById = (id) => FRAME_LIST.find((frame) => frame.id === id) || FRAME_LIST[0];
