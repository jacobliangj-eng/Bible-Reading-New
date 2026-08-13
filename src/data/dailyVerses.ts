import { BibleVersion } from '../types';

export interface DailyVerse {
  text: Record<BibleVersion, string>;
  reference: Record<BibleVersion, string>;
}

export const DAILY_VERSES: DailyVerse[] = [
  {
    text: {
      CUV: '「草必枯乾，花必凋殘，惟有我們神的話必永遠立定。」',
      KJV: '"The grass withereth, the flower fadeth: but the word of our God shall stand for ever."',
      LSG: '« L\'herbe sèche, la fleur tombe; Mais la parole de notre Dieu subsiste éternellement. »',
    },
    reference: {
      CUV: '以賽亞書 Isaiah 40:8',
      KJV: 'Isaiah 40:8',
      LSG: 'Ésaïe 40:8',
    },
  },
  {
    text: {
      CUV: '「耶和華是我的牧者，我必不致缺乏。」',
      KJV: '"The LORD is my shepherd; I shall not want."',
      LSG: '« L\'Éternel est mon berger: je ne manquerai de rien. »',
    },
    reference: {
      CUV: '詩篇 Psalm 23:1',
      KJV: 'Psalm 23:1',
      LSG: 'Psaume 23:1',
    },
  },
  {
    text: {
      CUV: '「神愛世人，甚至將他的獨生子賜給他們，叫一切信他的，不致滅亡，反得永生。」',
      KJV: '"For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life."',
      LSG: '« Car Dieu a tant aimé le monde qu\'il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu\'il ait la vie éternelle. »',
    },
    reference: {
      CUV: '約翰福音 John 3:16',
      KJV: 'John 3:16',
      LSG: 'Jean 3:16',
    },
  },
  {
    text: {
      CUV: '「我靠著那加給我力量的，凡事都能作。」',
      KJV: '"I can do all things through Christ which strengtheneth me."',
      LSG: '« Je puis tout par celui qui me fortifie. »',
    },
    reference: {
      CUV: '腓立比書 Philippians 4:13',
      KJV: 'Philippians 4:13',
      LSG: 'Philippiens 4:13',
    },
  },
  {
    text: {
      CUV: '「你要專心仰賴耶和華，不可倚靠自己的聰明，在你一切所行的事上都要認定他，他必指引你的路。」',
      KJV: '"Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths."',
      LSG: '« Confie-toi en l\'Éternel de tout ton cœur, Et ne t\'appuie pas sur ta sagesse; Reconnais-le dans toutes tes voies, Et il aplanira tes sentiers. »',
    },
    reference: {
      CUV: '箴言 Proverbs 3:5-6',
      KJV: 'Proverbs 3:5-6',
      LSG: 'Proverbes 3:5-6',
    },
  },
  {
    text: {
      CUV: '「我豈沒有吩咐你嗎？你當剛強壯膽！不要懼怕，也不要驚晃；因為你無論往哪裡去，耶和華―你的神必與你同在。」',
      KJV: '"Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest."',
      LSG: '« Ne t\'ai-je pas donné cet ordre: Fortifie-toi et prends courage? Ne t\'effraie point et ne t\'épouvante point, car l\'Éternel, ton Dieu, est avec toi dans tout ce que tu entreprendras. »',
    },
    reference: {
      CUV: '約書亞記 Joshua 1:9',
      KJV: 'Joshua 1:9',
      LSG: 'Josué 1:9',
    },
  },
  {
    text: {
      CUV: '「我們曉得萬事都互相效力，叫愛神的人得益處，就是按他旨意被召的人。」',
      KJV: '"And we know that all things work together for good to them that love God, to them who are the called according to his purpose."',
      LSG: '« Nous savons, du reste, que toutes choses concourent au bien de ceux qui aiment Dieu, de ceux qui sont appelés selon son dessein. »',
    },
    reference: {
      CUV: '羅馬書 Romans 8:28',
      KJV: 'Romans 8:28',
      LSG: 'Romains 8:28',
    },
  },
  {
    text: {
      CUV: '「你的話是我腳前的燈，是我路上的光。」',
      KJV: '"Thy word is a lamp unto my feet, and a light unto my path."',
      LSG: '« Ta parole est une lampe à mes pieds, Et une lumière sur mon sentier. »',
    },
    reference: {
      CUV: '詩篇 Psalm 119:105',
      KJV: 'Psalm 119:105',
      LSG: 'Psaume 119:105',
    },
  },
  {
    text: {
      CUV: '「凡勞苦擔重擔的人可以到我這裡來，我就使你們得安息。」',
      KJV: '"Come unto me, all ye that labour and are heavy laden, and I will give you rest."',
      LSG: '« Venez à moi, vous tous qui êtes fatigués et chargés, et je vous donnerai du repos. »',
    },
    reference: {
      CUV: '馬太福音 Matthew 11:28',
      KJV: 'Matthew 11:28',
      LSG: 'Matthieu 11:28',
    },
  },
  {
    text: {
      CUV: '「聖靈所結的果子，就是仁愛、喜樂、和平、忍耐、恩慈、良善、信實、溫柔、節制。」',
      KJV: '"But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith, meekness, temperance."',
      LSG: '« Mais le fruit de l\'Esprit, c\'est l\'amour, la joie, la paix, la patience, la bonté, la bénignité, la fidélité, la douceur, la tempérance. »',
    },
    reference: {
      CUV: '加拉太書 Galatians 5:22-23',
      KJV: 'Galatians 5:22-23',
      LSG: 'Galates 5:22-23',
    },
  },
  {
    text: {
      CUV: '「神是我們的避難所，是我們的力量，是我們在患難中隨時的幫助。」',
      KJV: '"God is our refuge and strength, a very present help in trouble."',
      LSG: '« Dieu est pour nous un refuge et un appui, Un secours qui ne manque jamais dans la détresse. »',
    },
    reference: {
      CUV: '詩篇 Psalm 46:1',
      KJV: 'Psalm 46:1',
      LSG: 'Psaume 46:1',
    },
  },
  {
    text: {
      CUV: '「耶和華說：我知道我向你們所懷的意念是賜平安的意念，不是降災害的意念，要叫你們末後有指望。」',
      KJV: '"For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end."',
      LSG: '« Car je connais les projets que j\'ai formés sur vous, dit l\'Éternel, projets de paix et non de malheur, afin de vous donner un avenir et de l\'espérance. »',
    },
    reference: {
      CUV: '耶利米書 Jeremiah 29:11',
      KJV: 'Jeremiah 29:11',
      LSG: 'Jérémie 29:11',
    },
  },
  {
    text: {
      CUV: '「若有人在基督裡，他就是新造的人，舊事已過，都變成新的了。」',
      KJV: '"Therefore if any man be in Christ, he is a new creature: old things are passed away; behold, all things are become new."',
      LSG: '« Si quelqu\'un est en Christ, il est une nouvelle créature. Les choses anciennes sont passées; voici, toutes choses sont devenues nouvelles. »',
    },
    reference: {
      CUV: '哥林多後書 2 Corinthians 5:17',
      KJV: '2 Corinthians 5:17',
      LSG: '2 Corinthiens 5:17',
    },
  },
  {
    text: {
      CUV: '「耶和華是我的亮光，是我的拯救，我還怕誰呢？耶和華是我生命的保障，我還懼誰呢？」',
      KJV: '"The LORD is my light and my salvation; whom shall I fear? the LORD is the strength of my life; of whom shall I be afraid?"',
      LSG: '« L\'Éternel est ma lumière et mon salut: De qui aurais-je crainte? L\'Éternel est le soutien de ma vie: De qui aurais-je peur? »',
    },
    reference: {
      CUV: '詩篇 Psalm 27:1',
      KJV: 'Psalm 27:1',
      LSG: 'Psaume 27:1',
    },
  },
  {
    text: {
      CUV: '「你不要害怕，因為我與你同在；不要驚惶，因為我是你的神。我必堅固你，我必幫助你；我必用我公義的右手扶持你。」',
      KJV: '"Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness."',
      LSG: '« Ne crains rien, car je suis avec toi; Ne promène pas des regards inquiets, car je suis ton Dieu; Je te fortifie, je viens à ton secours, Je te soutiens de ma droite triomphante. »',
    },
    reference: {
      CUV: '以賽亞書 Isaiah 41:10',
      KJV: 'Isaiah 41:10',
      LSG: 'Ésaïe 41:10',
    },
  },
  {
    text: {
      CUV: '「如今常存的有信，有望，有愛這三樣，其中最大的是愛。」',
      KJV: '"And now abideth faith, hope, charity, these three; but the greatest of these is charity."',
      LSG: '« Maintenant donc ces trois choses demeurent: la foi, l\'espérance, la charité; mais la plus grande de ces choses, c\'est la charité. »',
    },
    reference: {
      CUV: '哥林多前書 1 Corinthians 13:13',
      KJV: '1 Corinthians 13:13',
      LSG: '1 Corinthiens 13:13',
    },
  },
  {
    text: {
      CUV: '「因為耶和華本為善。他的慈愛存到永遠；他的信實直到萬代。」',
      KJV: '"For the LORD is good; his mercy is everlasting; and his truth endureth to all generations."',
      LSG: '« Car l\'Éternel est bon; sa bonté dure toujours, Et sa fidélité de génération en génération. »',
    },
    reference: {
      CUV: '詩篇 Psalm 100:5',
      KJV: 'Psalm 100:5',
      LSG: 'Psaume 100:5',
    },
  },
  {
    text: {
      CUV: '「你們要先求他的國和他的義，這些東西都要加給你們了。」',
      KJV: '"But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you."',
      LSG: '« Cherchez premièrement le royaume et la justice de Dieu; et toutes ces choses vous seront données par-dessus. »',
    },
    reference: {
      CUV: '馬太福音 Matthew 6:33',
      KJV: 'Matthew 6:33',
      LSG: 'Matthieu 6:33',
    },
  },
  {
    text: {
      CUV: '「信就是所望之事的實底，是未見之事的確據。」',
      KJV: '"Now faith is the substance of things hoped for, the evidence of things not seen."',
      LSG: '« Or la foi est une ferme assurance des choses qu\'on espère, une démonstration de celles qu\'on ne voit pas. »',
    },
    reference: {
      CUV: '希伯來書 Hebrews 11:1',
      KJV: 'Hebrews 11:1',
      LSG: 'Hébreux 11:1',
    },
  },
  {
    text: {
      CUV: '「要常常喜樂，不停地禱告，凡事謝恩；因為這是神在基督耶穌裡向你們所定的旨意。」',
      KJV: '"Rejoice evermore. Pray without ceasing. In every thing give thanks: for this is the will of God in Christ Jesus concerning you."',
      LSG: '« Soyez toujours joyeux. Priez sans cesse. Rendez grâces en toutes choses, car c\'est à votre égard la volonté de Dieu en Jésus Christ. »',
    },
    reference: {
      CUV: '帖撒羅尼迦前書 1 Thessalonians 5:16-18',
      KJV: '1 Thessalonians 5:16-18',
      LSG: '1 Thessaloniciens 5:16-18',
    },
  },
  {
    text: {
      CUV: '「我要向山舉目；我的幫助從何而來？我的幫助從造天地的耶和華而來。」',
      KJV: '"I will lift up mine eyes unto the hills, from whence cometh my help. My help cometh from the LORD, which made heaven and earth."',
      LSG: '« Je lève mes yeux vers les montagnes... D\'où me viendra le secours? Le secours me vient de l\'Éternel, Qui a fait les cieux et la terre. »',
    },
    reference: {
      CUV: '詩篇 Psalm 121:1-2',
      KJV: 'Psalm 121:1-2',
      LSG: 'Psaume 121:1-2',
    },
  },
  {
    text: {
      CUV: '「我們不致消滅，是出於耶和華諸般的大慈愛；是因他的憐憫不致斷絕。每早晨，這都是新的；你的誠實極其廣大！」',
      KJV: '"It is of the LORD\'s mercies that we are not consumed, because his compassions fail not. They are new every morning: great is thy faithfulness."',
      LSG: '« Les bontés de l\'Éternel ne sont pas épuisées, Ses compassions ne sont pas à leur terme; Elles se renouvellent chaque matin. Oh! que ta fidélité est grande! »',
    },
    reference: {
      CUV: '耶利米哀歌 Lamentations 3:22-23',
      KJV: 'Lamentations 3:22-23',
      LSG: 'Lamentations 3:22-23',
    },
  },
  {
    text: {
      CUV: '「你們要嚐嚐主恩的滋味，便知道他是美善；投靠他的人有福了！」',
      KJV: '"O taste and see that the LORD is good: blessed is the man that trusteth in him."',
      LSG: '« Sentez et voyez combien l\'Éternel est bon! Heureux l\'homme qui cherche en lui son refuge! »',
    },
    reference: {
      CUV: '詩篇 Psalm 34:8',
      KJV: 'Psalm 34:8',
      LSG: 'Psaume 34:8',
    },
  },
  {
    text: {
      CUV: '「無論作什麼，都要從心裡作，像是給主作的，不是給人作的。」',
      KJV: '"And whatsoever ye do, do it heartily, as to the Lord, and not unto men."',
      LSG: '« Tout ce que vous faites, faites-le de bon cœur, comme pour le Seigneur et non pour des hommes. »',
    },
    reference: {
      CUV: '歌羅西書 Colossians 3:23',
      KJV: 'Colossians 3:23',
      LSG: 'Colossiens 3:23',
    },
  },
  {
    text: {
      CUV: '「因為神賜給我們，不是膽怯的心，乃是剛強、仁愛、謹守的心。」',
      KJV: '"For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind."',
      LSG: '« Car ce n\'est pas un esprit de timidité que Dieu nous a donné, mais un esprit de force, d\'amour et de sagesse. »',
    },
    reference: {
      CUV: '提摩太後書 2 Timothy 1:7',
      KJV: '2 Timothy 1:7',
      LSG: '2 Timothée 1:7',
    },
  },
  {
    text: {
      CUV: '「你們得救是本乎恩，也因著信；這並不是出於自己，乃是神所賜的。」',
      KJV: '"For by grace are ye saved through faith; and that not of yourselves: it is the gift of God."',
      LSG: '« Car c\'est par la grâce que vous êtes sauvés, par le moyen de la foi. Et cela ne vient pas de vous, c\'est le don de Dieu. »',
    },
    reference: {
      CUV: '以弗所書 Ephesians 2:8',
      KJV: 'Ephesians 2:8',
      LSG: 'Éphésiens 2:8',
    },
  },
  {
    text: {
      CUV: '「耶和華―我的磐石，我的救贖主啊，願我口中的言語、心裡的意念在你面前得蒙悅納。」',
      KJV: '"Let the words of my mouth, and the meditation of my heart, be acceptable in thy sight, O LORD, my strength, and my redeemer."',
      LSG: '« Reçois favorablement les paroles de ma bouche Et les sentiments de mon cœur, O Éternel, mon rocher et mon libérateur! »',
    },
    reference: {
      CUV: '詩篇 Psalm 19:14',
      KJV: 'Psalm 19:14',
      LSG: 'Psaume 19:14',
    },
  },
  {
    text: {
      CUV: '「我們愛，因為神先愛我們。」',
      KJV: '"We love him, because he first loved us."',
      LSG: '« Pour nous, nous l\'aimons, parce qu\'il nous a aimés le premier. »',
    },
    reference: {
      CUV: '約翰一書 1 John 4:19',
      KJV: '1 John 4:19',
      LSG: '1 Jean 4:19',
    },
  },
  {
    text: {
      CUV: '「我的心哪，你要稱頌耶和華！凡在我裡面的，也要稱頌他的聖名！我的心哪，你要稱頌耶和華！不可忘記他的一切恩惠！」',
      KJV: '"Bless the LORD, O my soul: and all that is within me, bless his holy name. Bless the LORD, O my soul, and forget not all his benefits."',
      LSG: '« Mon âme, bénis l\'Éternel! Que tout ce qui est en moi bénisse son saint nom! Mon âme, bénis l\'Éternel, Et n\'oublie aucun de ses bienfaits! »',
    },
    reference: {
      CUV: '詩篇 Psalm 103:1-2',
      KJV: 'Psalm 103:1-2',
      LSG: 'Psaume 103:1-2',
    },
  },
  {
    text: {
      CUV: '「但那等候耶和華的必重新得力。他們必如鷹展翅上騰；他們奔跑卻不困倦，行走卻不疲乏。」',
      KJV: '"But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint."',
      LSG: '« Mais ceux qui se confient en l\'Éternel renouvelleront leur force. Ils prendront leur vol comme des aigles; Ils courront et ne se fatigueront point, Ils marcheront et ne se lasseront point. »',
    },
    reference: {
      CUV: '以賽亞書 Isaiah 40:31',
      KJV: 'Isaiah 40:31',
      LSG: 'Ésaïe 40:31',
    },
  },
  {
    text: {
      CUV: '「你必將生命的道路指示我。在你面前有滿足的喜樂；在你右手中有永遠的福樂。」',
      KJV: '"Thou wilt shew me the path of life: in thy presence is fulness of joy; at thy right hand there are pleasures for evermore."',
      LSG: '« Tu me feras connaître le sentier de la vie; Il y a d\'abondantes joies devant ta face, Des délices éternelles à ta droite. »',
    },
    reference: {
      CUV: '詩篇 Psalm 16:11',
      KJV: 'Psalm 16:11',
      LSG: 'Psaume 16:11',
    },
  },
];

/**
 * Returns a deterministic Verse of the Day based on the current date YYYY-MM-DD.
 */
export function getDailyVerse(selectedVersion: BibleVersion = 'CUV'): { text: string; reference: string; rawVerse: DailyVerse } {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0;
  }
  
  const index = Math.abs(hash) % DAILY_VERSES.length;
  const verse = DAILY_VERSES[index];

  return {
    text: verse.text[selectedVersion] || verse.text.CUV,
    reference: verse.reference[selectedVersion] || verse.reference.CUV,
    rawVerse: verse,
  };
}

/**
 * Returns a randomly selected verse from the database.
 */
export function getRandomVerse(selectedVersion: BibleVersion = 'CUV'): { text: string; reference: string; rawVerse: DailyVerse } {
  const index = Math.floor(Math.random() * DAILY_VERSES.length);
  const verse = DAILY_VERSES[index];

  return {
    text: verse.text[selectedVersion] || verse.text.CUV,
    reference: verse.reference[selectedVersion] || verse.reference.CUV,
    rawVerse: verse,
  };
}

