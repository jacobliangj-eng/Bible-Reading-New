/**
 * Classical Chinese Union Version (和合本) Canonical Section Subtitles
 * 涵蓋新舊約經典章節之分段小標題，供離線及備援 API 即時比對呈現
 */

export interface SubtitleEntry {
  verse: number;
  subtitle: string;
}

// BookId -> Chapter -> Array of SubtitleEntry
export const CUV_SECTION_SUBTITLES: Record<string, Record<number, SubtitleEntry[]>> = {
  // 創世記 (Genesis)
  GEN: {
    1: [
      { verse: 1, subtitle: '【　神創造天地】' },
      { verse: 3, subtitle: '【第一日：造光】' },
      { verse: 6, subtitle: '【第二日：造空氣】' },
      { verse: 9, subtitle: '【第三日：聚水造陸與植物】' },
      { verse: 14, subtitle: '【第四日：造日月星辰】' },
      { verse: 20, subtitle: '【第五日：造水中物與雀鳥】' },
      { verse: 24, subtitle: '【第六日：造地獸與按神形像造人】' },
      { verse: 26, subtitle: '【照自己形像造人】' },
    ],
    2: [
      { verse: 1, subtitle: '【第七日：　神所賜的安息】' },
      { verse: 4, subtitle: '【伊甸園的建立與生命樹】' },
      { verse: 18, subtitle: '【　神為亞當造配偶】' },
    ],
    3: [
      { verse: 1, subtitle: '【始祖受誘惑與犯罪】' },
      { verse: 8, subtitle: '【　神的呼喚與審判】' },
      { verse: 21, subtitle: '【以皮衣遮身並逐出伊甸園】' },
    ],
    4: [
      { verse: 1, subtitle: '【該隱與亞伯的祭】' },
      { verse: 17, subtitle: '【該隱的後代與塞特】' },
    ],
    6: [
      { verse: 1, subtitle: '【世人罪惡與挪亞蒙恩】' },
      { verse: 13, subtitle: '【　神吩咐挪亞造方舟】' },
    ],
    9: [
      { verse: 1, subtitle: '【　神與挪亞立彩虹之約】' },
    ],
    11: [
      { verse: 1, subtitle: '【巴別塔與口音混亂】' },
      { verse: 27, subtitle: '【他拉的後代與亞伯蘭出迦勒底】' },
    ],
    12: [
      { verse: 1, subtitle: '【耶和華呼召亞伯蘭】' },
      { verse: 10, subtitle: '【亞伯蘭暫居埃及】' },
    ],
    15: [
      { verse: 1, subtitle: '【　神與亞伯蘭立約應許後裔】' },
    ],
    17: [
      { verse: 1, subtitle: '【改名亞伯拉罕與割禮之約】' },
    ],
    22: [
      { verse: 1, subtitle: '【亞伯拉罕獻以撒】' },
      { verse: 15, subtitle: '【耶和華以勒與再賜大福】' },
    ],
    28: [
      { verse: 10, subtitle: '【雅各伯特利之夢：天梯與誓言】' },
    ],
    32: [
      { verse: 22, subtitle: '【雅各雅博渡口與天使摔跤（改名以色列）】' },
    ],
    37: [
      { verse: 1, subtitle: '【約瑟的異夢與被賣至埃及】' },
    ],
    45: [
      { verse: 1, subtitle: '【約瑟與弟兄相認】' },
    ],
    50: [
      { verse: 15, subtitle: '【約瑟寬恕弟兄（神的意思原是好的）】' },
    ],
  },

  // 出埃及記 (Exodus)
  EXO: {
    3: [
      { verse: 1, subtitle: '【荊棘火焰中蒙召（我是自有永有的）】' },
    ],
    12: [
      { verse: 1, subtitle: '【逾越節的條例與定例】' },
      { verse: 29, subtitle: '【滅長子之災與以色列人出埃及】' },
    ],
    14: [
      { verse: 1, subtitle: '【過紅海如行乾地】' },
    ],
    20: [
      { verse: 1, subtitle: '【　神頒布十條誡命】' },
      { verse: 18, subtitle: '【百姓敬畏　神】' },
    ],
    34: [
      { verse: 1, subtitle: '【重鑿法版與耶和華宣告聖名】' },
    ],
  },

  // 詩篇 (Psalms)
  PSA: {
    1: [{ verse: 1, subtitle: '【義人與惡人的道路（有福的人）】' }],
    2: [{ verse: 1, subtitle: '【彌賽亞君王的受膏與權柄】' }],
    8: [{ verse: 1, subtitle: '【耶和華的名在全地何其美（人算甚麼）】' }],
    19: [
      { verse: 1, subtitle: '【諸天述說　神的榮耀】' },
      { verse: 7, subtitle: '【耶和華的律法全備能甦醒人心】' },
    ],
    23: [{ verse: 1, subtitle: '【耶和華是我的牧者】' }],
    27: [{ verse: 1, subtitle: '【耶和華是我的亮光，是我的拯救】' }],
    34: [{ verse: 1, subtitle: '【稱頌投靠耶和華（你們要嘗嘗主恩的美善）】' }],
    42: [{ verse: 1, subtitle: '【如鹿切慕溪水（我的心哪，你為何憂悶）】' }],
    46: [{ verse: 1, subtitle: '【　神是我們的避難所，是我們的力量】' }],
    51: [{ verse: 1, subtitle: '【大衛認罪痛悔詩（求你為我造清潔的心）】' }],
    90: [{ verse: 1, subtitle: '【摩西的祈禱（求你指教我們怎樣數算自己的日子）】' }],
    91: [{ verse: 1, subtitle: '【住在至高者隱密處的（耶和華是我的避難所）】' }],
    100: [{ verse: 1, subtitle: '【普天下向耶和華歡呼（稱謝進祂的門）】' }],
    103: [{ verse: 1, subtitle: '【我的心哪，你要稱頌耶和華（不可忘記祂的一切恩惠）】' }],
    119: [
      { verse: 1, subtitle: '【讚美耶和華的律法為至寶】' },
      { verse: 105, subtitle: '【你的話是我腳前的燈，是我路上的光】' },
    ],
    121: [{ verse: 1, subtitle: '【我要向山舉目（我的幫助從造天地的耶和華而來）】' }],
    139: [{ verse: 1, subtitle: '【神全知全在全能的鑒察】' }],
    150: [{ verse: 1, subtitle: '【大讚美詩（凡有氣息的都要讚美耶和華）】' }],
  },

  // 以賽亞書 (Isaiah)
  ISA: {
    6: [{ verse: 1, subtitle: '【以賽亞看見主榮耀與蒙召奉差遣】' }],
    7: [{ verse: 14, subtitle: '【必有童女懷孕生子，人要稱祂的名為以馬內利】' }],
    9: [{ verse: 1, subtitle: '【有一嬰孩為我們而生（和平的君）】' }],
    40: [
      { verse: 1, subtitle: '【你們要安慰我的百姓】' },
      { verse: 28, subtitle: '【那等候耶和華的必從新得力】' },
    ],
    53: [
      { verse: 1, subtitle: '【受苦的僕人（祂為我們的過犯受害）】' },
    ],
    55: [{ verse: 1, subtitle: '【白白恩典的邀請（你們一切乾渴的都當就近水來）】' }],
    61: [{ verse: 1, subtitle: '【主耶和華的靈在我身上（傳好信息給謙卑的人）】' }],
  },

  // 馬太福音 (Matthew)
  MAT: {
    1: [
      { verse: 1, subtitle: '【耶穌基督的家譜】' },
      { verse: 18, subtitle: '【耶穌基督降生】' },
    ],
    2: [
      { verse: 1, subtitle: '【東方博士前來朝拜】' },
      { verse: 13, subtitle: '【逃往埃及與居拿撒勒】' },
    ],
    3: [
      { verse: 1, subtitle: '【施洗約翰傳道】' },
      { verse: 13, subtitle: '【耶穌受洗】' },
    ],
    4: [
      { verse: 1, subtitle: '【耶穌受魔鬼試探】' },
      { verse: 12, subtitle: '【在加利利開展傳道】' },
      { verse: 18, subtitle: '【呼召四個漁夫】' },
    ],
    5: [
      { verse: 1, subtitle: '【登山寶訓：論八福】' },
      { verse: 13, subtitle: '【世上的鹽與世上的光】' },
      { verse: 17, subtitle: '【耶穌成全律法】' },
      { verse: 21, subtitle: '【論發怒】' },
      { verse: 27, subtitle: '【論姦淫與起誓】' },
      { verse: 38, subtitle: '【論報復與愛仇敵】' },
    ],
    6: [
      { verse: 1, subtitle: '【論施捨】' },
      { verse: 5, subtitle: '【論禱告與主教導的禱告（主禱文）】' },
      { verse: 16, subtitle: '【論禁食】' },
      { verse: 19, subtitle: '【積攢財寶在天上】' },
      { verse: 25, subtitle: '【不要為生命憂慮（先求神的國和祂的義）】' },
    ],
    7: [
      { verse: 1, subtitle: '【不要論斷人】' },
      { verse: 7, subtitle: '【祈求、尋找、叩門】' },
      { verse: 13, subtitle: '【窄門與寬門】' },
      { verse: 15, subtitle: '【從果子看樹】' },
      { verse: 24, subtitle: '【房子蓋在磐石上】' },
    ],
    11: [
      { verse: 25, subtitle: '【凡勞苦擔重擔的人可以到我這裏來】' },
    ],
    13: [
      { verse: 1, subtitle: '【撒種的比喻】' },
      { verse: 24, subtitle: '【稗子的比喻】' },
      { verse: 31, subtitle: '【芥菜種與麵酵的比喻】' },
      { verse: 44, subtitle: '【藏寶與尋珠的比喻】' },
    ],
    28: [
      { verse: 1, subtitle: '【耶穌基督從死裏復活】' },
      { verse: 16, subtitle: '【頒布普世傳福音大使命】' },
    ],
  },

  // 馬可福音 (Mark)
  MRK: {
    1: [
      { verse: 1, subtitle: '【神的兒子，耶穌基督福音的起頭】' },
      { verse: 9, subtitle: '【耶穌受洗與受試探】' },
      { verse: 14, subtitle: '【天國近了，你們當悔改，信福音】' },
    ],
    16: [
      { verse: 1, subtitle: '【耶穌復活與向門徒顯現】' },
      { verse: 14, subtitle: '【往普天下去傳福音給萬民聽】' },
    ],
  },

  // 路加福音 (Luke)
  LUK: {
    1: [
      { verse: 26, subtitle: '【天使預告耶穌降生】' },
      { verse: 46, subtitle: '【馬利亞尊主頌】' },
    ],
    2: [
      { verse: 1, subtitle: '【耶穌在伯利恆降生】' },
      { verse: 8, subtitle: '【牧羊人聽聞大喜的信息】' },
    ],
    10: [
      { verse: 25, subtitle: '【好撒瑪利亞人的比喻】' },
      { verse: 38, subtitle: '【馬大與馬利亞（選擇那上好的福分）】' },
    ],
    15: [
      { verse: 1, subtitle: '【失羊的比喻】' },
      { verse: 8, subtitle: '【失錢的比喻】' },
      { verse: 11, subtitle: '【浪子回頭的比喻】' },
    ],
  },

  // 約翰福音 (John)
  JHN: {
    1: [
      { verse: 1, subtitle: '【太初有道（道成肉身）】' },
      { verse: 19, subtitle: '【施洗約翰的見證（看哪，神的羔羊）】' },
      { verse: 35, subtitle: '【耶穌呼召最初的門徒】' },
    ],
    2: [
      { verse: 1, subtitle: '【迦拿婚宴水變酒（頭一件神蹟）】' },
      { verse: 13, subtitle: '【耶穌潔淨聖殿】' },
    ],
    3: [
      { verse: 1, subtitle: '【耶穌與尼哥底母論重生】' },
      { verse: 16, subtitle: '【　神愛世人】' },
      { verse: 19, subtitle: '【作惡的恨光】' },
      { verse: 22, subtitle: '【耶穌和約翰施洗】' },
      { verse: 31, subtitle: '【信者得永生】' },
    ],
    4: [
      { verse: 1, subtitle: '【敘加井旁的撒瑪利亞婦人（活水江河）】' },
      { verse: 43, subtitle: '【醫治大臣的兒子】' },
    ],
    6: [
      { verse: 1, subtitle: '【五餅二魚餵飽五千人】' },
      { verse: 16, subtitle: '【耶穌在海面上行走】' },
      { verse: 22, subtitle: '【我就是生命的糧】' },
    ],
    8: [
      { verse: 1, subtitle: '【行淫時被捉的婦人】' },
      { verse: 12, subtitle: '【我就是世界的光】' },
      { verse: 31, subtitle: '【真理必叫你們得以自由】' },
    ],
    10: [
      { verse: 1, subtitle: '【我就是羊的門，我是好牧人】' },
    ],
    11: [
      { verse: 1, subtitle: '【拉撒路死與復活（復活在我，生命也在我）】' },
    ],
    14: [
      { verse: 1, subtitle: '【我就是道路、真理、生命】' },
      { verse: 15, subtitle: '【應許賜下保惠師聖靈】' },
    ],
    15: [
      { verse: 1, subtitle: '【我是真葡萄樹，你們是枝子】' },
      { verse: 12, subtitle: '【你們要彼此相愛】' },
    ],
    17: [
      { verse: 1, subtitle: '【耶穌分離前的崇高大祭司禱告】' },
    ],
    20: [
      { verse: 1, subtitle: '【耶穌復活與顯現】' },
      { verse: 24, subtitle: '【多馬信主（那沒有看見就信的有福了）】' },
    ],
    21: [
      { verse: 1, subtitle: '【提比哩亞海邊顯現（你愛我比這些更深麼）】' },
    ],
  },

  // 羅馬書 (Romans)
  ROM: {
    1: [{ verse: 16, subtitle: '【我不以福音為恥（義人必因信得生）】' }],
    3: [{ verse: 21, subtitle: '【因信稱義的真理】' }],
    5: [{ verse: 1, subtitle: '【因信稱義帶來的平安與盼望】' }],
    8: [
      { verse: 1, subtitle: '【隨從聖靈的生活（在基督裡不被定罪）】' },
      { verse: 28, subtitle: '【萬事互相效力（誰能使我們與基督的愛隔絕）】' },
    ],
    12: [
      { verse: 1, subtitle: '【將身體獻上當作活祭】' },
      { verse: 9, subtitle: '【基督徒愛人處世的法則】' },
    ],
  },

  // 哥林多前書 (1 Corinthians)
  '1CO': {
    13: [{ verse: 1, subtitle: '【愛的頌歌（愛是恆久忍耐，又有恩慈）】' }],
    15: [{ verse: 1, subtitle: '【基督復活的真道與復活的榮耀】' }],
  },

  // 加拉太書 (Galatians)
  GAL: {
    5: [{ verse: 22, subtitle: '【聖靈所結的九樣果子】' }],
  },

  // 以弗所書 (Ephesians)
  EPH: {
    6: [{ verse: 10, subtitle: '【穿戴　神所賜的全副軍裝】' }],
  },

  // 腓立比書 (Philippians)
  PHP: {
    4: [
      { verse: 4, subtitle: '【你們要靠主常常喜樂】' },
      { verse: 6, subtitle: '【應當一無掛慮，凡事藉著禱告祈求】' },
      { verse: 13, subtitle: '【我靠著那加給我力量的，凡事都能做】' },
    ],
  },

  // 希伯來書 (Hebrews)
  HEB: {
    11: [{ verse: 1, subtitle: '【信心的真諦與信心偉人篇】' }],
    12: [{ verse: 1, subtitle: '【仰望為我們信心創始成終的耶穌】' }],
  },

  // 啟示錄 (Revelation)
  REV: {
    1: [{ verse: 1, subtitle: '【約翰得基督的啟示與七個金燈臺】' }],
    21: [{ verse: 1, subtitle: '【新天新地與聖城新耶路撒冷】' }],
    22: [{ verse: 1, subtitle: '【生命水的河與主必快來】' }],
  },
};

/**
 * Get curated canonical subtitle for a specific book, chapter, and verse.
 */
export function getCuratedSubtitle(bookId: string, chapter: number, verse: number): string | undefined {
  const chapterSubtitles = CUV_SECTION_SUBTITLES[bookId]?.[chapter];
  if (!chapterSubtitles) return undefined;
  const match = chapterSubtitles.find((s) => s.verse === verse);
  return match?.subtitle;
}
