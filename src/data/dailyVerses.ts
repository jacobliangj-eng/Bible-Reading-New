import { BibleVersion } from '../types';

export interface DailyVerse {
  text: Partial<Record<BibleVersion, string>>;
  reference: Partial<Record<BibleVersion, string>>;
}

export const DAILY_VERSES: DailyVerse[] = [
  {
    text: {
      CUV: '「草必枯乾，花必凋殘，惟有我們神的話必永遠立定。」',
      WEB: '"The grass withereth, the flower fadeth: but the word of our God shall stand for ever."',
      LSG: '« L\'herbe sèche, la fleur tombe; Mais la parole de notre Dieu subsiste éternellement. »',
    },
    reference: {
      CUV: '以賽亞書 40:8',
      WEB: 'Isaiah 40:8',
      LSG: 'Ésaïe 40:8',
    },
  },
  {
    text: {
      CUV: '「耶和華是我的牧者，我必不致缺乏。」',
      WEB: '"The LORD is my shepherd; I shall not want."',
      LSG: '« L\'Éternel est mon berger: je ne manquerai de rien. »',
    },
    reference: {
      CUV: '詩篇 23:1',
      WEB: 'Psalm 23:1',
      LSG: 'Psaume 23:1',
    },
  },
  {
    text: {
      CUV: '「神愛世人，甚至將他的獨生子賜給他們，叫一切信他的，不致滅亡，反得永生。」',
      WEB: '"For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life."',
      LSG: '« Car Dieu a tant aimé le monde qu\'il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu\'il ait la vie éternelle. »',
    },
    reference: {
      CUV: '約翰福音 3:16',
      WEB: 'John 3:16',
      LSG: 'Jean 3:16',
    },
  },
  {
    text: {
      CUV: '「我靠著那加給我力量的，凡事都能作。」',
      WEB: '"I can do all things through Christ which strengtheneth me."',
      LSG: '« Je puis tout par celui qui me fortifie. »',
    },
    reference: {
      CUV: '腓立比書 4:13',
      WEB: 'Philippians 4:13',
      LSG: 'Philippiens 4:13',
    },
  },
  {
    text: {
      CUV: '「你要專心仰賴耶和華，不可倚靠自己的聰明，在你一切所行的事上都要認定他，他必指引你的路。」',
      WEB: '"Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths."',
      LSG: '« Confie-toi en l\'Éternel de tout ton cœur, Et ne t\'appuie pas sur ta sagesse; Reconnais-le dans toutes tes voies, Et il aplanira tes sentiers. »',
    },
    reference: {
      CUV: '箴言 3:5-6',
      WEB: 'Proverbs 3:5-6',
      LSG: 'Proverbes 3:5-6',
    },
  },
  {
    text: {
      CUV: '「我豈沒有吩咐你嗎？你當剛強壯膽！不要懼怕，也不要驚惶；因為你無論往哪裡去，耶和華―你的神必與你同在。」',
      WEB: '"Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest."',
      LSG: '« Ne t\'ai-je pas donné cet ordre: Fortifie-toi et prends courage? Ne t\'effraie point et ne t\'épouvante point, car l\'Éternel, ton Dieu, est avec toi dans tout ce que tu entreprendras. »',
    },
    reference: {
      CUV: '約書亞記 1:9',
      WEB: 'Joshua 1:9',
      LSG: 'Josué 1:9',
    },
  },
  {
    text: {
      CUV: '「我們曉得萬事都互相效力，叫愛神的人得益處，就是按他旨意被召的人。」',
      WEB: '"And we know that all things work together for good to them that love God, to them who are the called according to his purpose."',
      LSG: '« Nous savons, du reste, que toutes choses concourent au bien de ceux qui aiment Dieu, de ceux qui sont appelés selon son dessein. »',
    },
    reference: {
      CUV: '羅馬書 8:28',
      WEB: 'Romans 8:28',
      LSG: 'Romains 8:28',
    },
  },
  {
    text: {
      CUV: '「你的話是我腳前的燈，是我路上的光。」',
      WEB: '"Thy word is a lamp unto my feet, and a light unto my path."',
      LSG: '« Ta parole est une lampe à mes pieds, Et une lumière sur mon sentier. »',
    },
    reference: {
      CUV: '詩篇 119:105',
      WEB: 'Psalm 119:105',
      LSG: 'Psaume 119:105',
    },
  },
  {
    text: {
      CUV: '「凡勞苦擔重擔的人可以到我這裡來，我就使你們得安息。」',
      WEB: '"Come unto me, all ye that labour and are heavy laden, and I will give you rest."',
      LSG: '« Venez à moi, vous tous qui êtes fatigués et chargés, et je vous donnerai du repos. »',
    },
    reference: {
      CUV: '馬太福音 11:28',
      WEB: 'Matthew 11:28',
      LSG: 'Matthieu 11:28',
    },
  },
  {
    text: {
      CUV: '「聖靈所結的果子，就是仁愛、喜樂、和平、忍耐、恩慈、良善、信實、溫柔、節制。這樣的事沒有律法禁止。」',
      WEB: '"But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith, meekness, temperance: against such there is no law."',
      LSG: '« Mais le fruit de l\'Esprit, c\'est l\'amour, la joie, la paix, la patience, la bonté, la bénignité, la fidélité, la douceur, la tempérance; la loi n\'est pas contre ces choses. »',
    },
    reference: {
      CUV: '加拉太書 5:22-23',
      WEB: 'Galatians 5:22-23',
      LSG: 'Galates 5:22-23',
    },
  },
  {
    text: {
      CUV: '「神是我們的避難所，是我們的力量，是我們在患難中隨時的幫助。」',
      WEB: '"God is our refuge and strength, a very present help in trouble."',
      LSG: '« Dieu est pour nous un refuge et un appui, Un secours qui ne manque jamais dans la détresse. »',
    },
    reference: {
      CUV: '詩篇 46:1',
      WEB: 'Psalm 46:1',
      LSG: 'Psaume 46:1',
    },
  },
  {
    text: {
      CUV: '「耶和華說：我知道我向你們所懷的意念是賜平安的意念，不是降災害的意念，要叫你們末後有指望。」',
      WEB: '"For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end."',
      LSG: '« Car je connais les projets que j\'ai formés sur vous, dit l\'Éternel, projets de paix et non de malheur, afin de vous donner un avenir et de l\'espérance. »',
    },
    reference: {
      CUV: '耶利米書 29:11',
      WEB: 'Jeremiah 29:11',
      LSG: 'Jérémie 29:11',
    },
  },
  {
    text: {
      CUV: '「若有人在基督裡，他就是新造的人，舊事已過，都變成新的了。」',
      WEB: '"Therefore if any man be in Christ, he is a new creature: old things are passed away; behold, all things are become new."',
      LSG: '« Si quelqu\'un est en Christ, il est une nouvelle créature. Les choses anciennes sont passées; voici, toutes choses sont devenues nouvelles. »',
    },
    reference: {
      CUV: '哥林多後書 5:17',
      WEB: '2 Corinthians 5:17',
      LSG: '2 Corinthiens 5:17',
    },
  },
  {
    text: {
      CUV: '「耶和華是我的亮光，是我的拯救，我還怕誰呢？耶和華是我性命的保障，我還懼誰呢？」',
      WEB: '"The LORD is my light and my salvation; whom shall I fear? the LORD is the strength of my life; of whom shall I be afraid?"',
      LSG: '« L\'Éternel est ma lumière et mon salut: De qui aurais-je crainte? L\'Éternel est le soutien de ma vie: De qui aurais-je peur? »',
    },
    reference: {
      CUV: '詩篇 27:1',
      WEB: 'Psalm 27:1',
      LSG: 'Psaume 27:1',
    },
  },
  {
    text: {
      CUV: '「你不要害怕，因為我與你同在；不要驚惶，因為我是你的神。我必堅固你，我必幫助你；我必用我公義的右手扶持你。」',
      WEB: '"Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness."',
      LSG: '« Ne crains rien, car je suis avec toi; Ne promène pas des regards inquiets, car je suis ton Dieu; Je te fortifie, je viens à ton secours, Je te soutiens de ma droite triomphante. »',
    },
    reference: {
      CUV: '以賽亞書 41:10',
      WEB: 'Isaiah 41:10',
      LSG: 'Ésaïe 41:10',
    },
  },
  {
    text: {
      CUV: '「如今常存的有信，有望，有愛這三樣，其中最大的是愛。」',
      WEB: '"And now abideth faith, hope, charity, these three; but the greatest of these is charity."',
      LSG: '« Maintenant donc ces trois choses demeurent: la foi, l\'espérance, la charité; mais la plus grande de ces choses, c\'est la charité. »',
    },
    reference: {
      CUV: '哥林多前書 13:13',
      WEB: '1 Corinthians 13:13',
      LSG: '1 Corinthiens 13:13',
    },
  },
  {
    text: {
      CUV: '「因為耶和華本為善。他的慈愛存到永遠；他的信實直到萬代。」',
      WEB: '"For the LORD is good; his mercy is everlasting; and his truth endureth to all generations."',
      LSG: '« Car l\'Éternel est bon; sa bonté dure toujours, Et sa fidélité de génération en génération. »',
    },
    reference: {
      CUV: '詩篇 100:5',
      WEB: 'Psalm 100:5',
      LSG: 'Psaume 100:5',
    },
  },
  {
    text: {
      CUV: '「你們要先求他的國和他的義，這些東西都要加給你們了。」',
      WEB: '"But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you."',
      LSG: '« Cherchez premièrement le royaume et la justice de Dieu; et toutes ces choses vous seront données par-dessus. »',
    },
    reference: {
      CUV: '馬太福音 6:33',
      WEB: 'Matthew 6:33',
      LSG: 'Matthieu 6:33',
    },
  },
  {
    text: {
      CUV: '「信就是所望之事的實底，是未見之事的確據。」',
      WEB: '"Now faith is the substance of things hoped for, the evidence of things not seen."',
      LSG: '« Or la foi est une ferme assurance des choses qu\'on espère, une démonstration de celles qu\'on ne voit pas. »',
    },
    reference: {
      CUV: '希伯來書 11:1',
      WEB: 'Hebrews 11:1',
      LSG: 'Hébreux 11:1',
    },
  },
  {
    text: {
      CUV: '「要常常喜樂，不住的禱告，凡事謝恩；因為這是神在基督耶穌裡向你們所定的旨意。」',
      WEB: '"Rejoice evermore. Pray without ceasing. In every thing give thanks: for this is the will of God in Christ Jesus concerning you."',
      LSG: '« Soyez toujours joyeux. Priez sans cesse. Rendez grâces en toutes choses, car c\'est à votre égard la volonté de Dieu en Jésus Christ. »',
    },
    reference: {
      CUV: '帖撒羅尼迦前書 5:16-18',
      WEB: '1 Thessalonians 5:16-18',
      LSG: '1 Thessaloniciens 5:16-18',
    },
  },
  {
    text: {
      CUV: '「我要向山舉目；我的幫助從何而來？我的幫助從造天地的耶和華而來。」',
      WEB: '"I will lift up mine eyes unto the hills, from whence cometh my help. My help cometh from the LORD, which made heaven and earth."',
      LSG: '« Je lève mes yeux vers les montagnes... D\'où me viendra le secours? Le secours me vient de l\'Éternel, Qui a fait les cieux et la terre. »',
    },
    reference: {
      CUV: '詩篇 121:1-2',
      WEB: 'Psalm 121:1-2',
      LSG: 'Psaume 121:1-2',
    },
  },
  {
    text: {
      CUV: '「我們不致消滅，是出於耶和華諸般的大慈愛；是因他的憐憫不致斷絕。每早晨，這都是新的；你的誠實極其廣大！」',
      WEB: '"It is of the LORD\'s mercies that we are not consumed, because his compassions fail not. They are new every morning: great is thy faithfulness."',
      LSG: '« Les bontés de l\'Éternel ne sont pas épuisées, Ses compassions ne sont pas à leur terme; Elles se renouvellent chaque matin. Oh! que ta fidélité est grande! »',
    },
    reference: {
      CUV: '耶利米哀歌 3:22-23',
      WEB: 'Lamentations 3:22-23',
      LSG: 'Lamentations 3:22-23',
    },
  },
  {
    text: {
      CUV: '「你們要嘗嘗主恩的滋味，便知道他是美善；投靠他的人有福了！」',
      WEB: '"O taste and see that the LORD is good: blessed is the man that trusteth in him."',
      LSG: '« Sentez et voyez combien l\'Éternel est bon! Heureux l\'homme qui cherche en lui son refuge! »',
    },
    reference: {
      CUV: '詩篇 34:8',
      WEB: 'Psalm 34:8',
      LSG: 'Psaume 34:8',
    },
  },
  {
    text: {
      CUV: '「無論作甚麼，都要從心裡作，像是給主作的，不是給人作的。」',
      WEB: '"And whatsoever ye do, do it heartily, as to the Lord, and not unto men."',
      LSG: '« Tout ce que vous faites, faites-le de bon cœur, comme pour le Seigneur et non pour des hommes. »',
    },
    reference: {
      CUV: '歌羅西書 3:23',
      WEB: 'Colossians 3:23',
      LSG: 'Colossiens 3:23',
    },
  },
  {
    text: {
      CUV: '「因為神賜給我們，不是膽怯的心，乃是剛強、仁愛、謹守的心。」',
      WEB: '"For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind."',
      LSG: '« Car ce n\'est pas un esprit de timidité que Dieu nous a donné, mais un esprit de force, d\'amour et de sagesse. »',
    },
    reference: {
      CUV: '提摩太後書 1:7',
      WEB: '2 Timothy 1:7',
      LSG: '2 Timothée 1:7',
    },
  },
  {
    text: {
      CUV: '「你們得救是本乎恩，也因著信；這並不是出於自己，乃是神所賜的。」',
      WEB: '"For by grace are ye saved through faith; and that not of yourselves: it is the gift of God."',
      LSG: '« Car c\'est par la grâce que vous êtes sauvés, par le moyen de la foi. Et cela ne vient pas de vous, c\'est le don de Dieu. »',
    },
    reference: {
      CUV: '以弗所書 2:8',
      WEB: 'Ephesians 2:8',
      LSG: 'Éphésiens 2:8',
    },
  },
  {
    text: {
      CUV: '「耶和華―我的磐石，我的救贖主啊，願我口中的言語、心裡的意念在你面前蒙悅納。」',
      WEB: '"Let the words of my mouth, and the meditation of my heart, be acceptable in thy sight, O LORD, my strength, and my redeemer."',
      LSG: '« Reçois favorablement les paroles de ma bouche Et les sentiments de mon cœur, O Éternel, mon rocher et mon libérateur! »',
    },
    reference: {
      CUV: '詩篇 19:14',
      WEB: 'Psalm 19:14',
      LSG: 'Psaume 19:14',
    },
  },
  {
    text: {
      CUV: '「我們愛，因為神先愛我們。」',
      WEB: '"We love him, because he first loved us."',
      LSG: '« Pour nous, nous l\'aimons, parce qu\'il nous a aimés le premier. »',
    },
    reference: {
      CUV: '約翰一書 4:19',
      WEB: '1 John 4:19',
      LSG: '1 Jean 4:19',
    },
  },
  {
    text: {
      CUV: '「我的心哪，你要稱頌耶和華！凡在我裡面的，也要稱頌他的聖名！我的心哪，你要稱頌耶和華！不可忘記他的一切恩惠！」',
      WEB: '"Bless the LORD, O my soul: and all that is within me, bless his holy name. Bless the LORD, O my soul, and forget not all his benefits."',
      LSG: '« Mon âme, bénis l\'Éternel! Que tout ce qui est en moi bénisse son saint nom! Mon âme, bénis l\'Éternel, Et n\'oublie aucun de ses bienfaits! »',
    },
    reference: {
      CUV: '詩篇 103:1-2',
      WEB: 'Psalm 103:1-2',
      LSG: 'Psaume 103:1-2',
    },
  },
  {
    text: {
      CUV: '「但那等候耶和華的必從新得力。他們必如鷹展翅上騰；他們奔跑卻不困倦，行走卻不疲乏。」',
      WEB: '"But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint."',
      LSG: '« Mais ceux qui se confient en l\'Éternel renouvelleront leur force. Ils prendront leur vol comme des aigles; Ils courront et ne se fatigueront point, Ils marcheront et ne se lasseront point. »',
    },
    reference: {
      CUV: '以賽亞書 40:31',
      WEB: 'Isaiah 40:31',
      LSG: 'Ésaïe 40:31',
    },
  },
  {
    text: {
      CUV: '「你必將生命的道路指示我。在你面前有滿足的喜樂；在你右手中有永遠的福樂。」',
      WEB: '"Thou wilt shew me the path of life: in thy presence is fulness of joy; at thy right hand there are pleasures for evermore."',
      LSG: '« Tu me feras connaître le sentier de la vie; Il y a d\'abondantes joies devant ta face, Des délices éternelles à ta droite. »',
    },
    reference: {
      CUV: '詩篇 16:11',
      WEB: 'Psalm 16:11',
      LSG: 'Psaume 16:11',
    },
  },
  {
    text: {
      CUV: '「世人哪，耶和華已指示你何為善。他向你所要的是甚麼呢？只要你行公義，好憐憫，存謙卑的心，與你的神同行。」',
      WEB: '"He hath shewed thee, O man, what is good; and what doth the LORD require of thee, but to do justly, and to love mercy, and to walk humbly with thy God?"',
      LSG: '« On t\'a fait connaître, ô homme, ce qui est bien; Et ce que l\'Éternel demande de toi, C\'est que tu pratiques la justice, Que tu aimes la miséricorde, Et que tu marches humblement avec ton Dieu. »',
    },
    reference: {
      CUV: '彌迦書 6:8',
      WEB: 'Micah 6:8',
      LSG: 'Michée 6:8',
    },
  },
  {
    text: {
      CUV: '「你要保守你心，勝過保守一切，因為一生的果效是由心發出。」',
      WEB: '"Keep thy heart with all diligence; for out of it are the issues of life."',
      LSG: '« Garde ton cœur plus que toute autre chose, Car de lui viennent les sources de la vie. »',
    },
    reference: {
      CUV: '箴言 4:23',
      WEB: 'Proverbs 4:23',
      LSG: 'Proverbes 4:23',
    },
  },
  {
    text: {
      CUV: '「應當一無挂慮，只要凡事藉著禱告、祈求，和感謝，將你們所要的告訴神。神所賜、出人意外的平安必在基督耶穌裡保守你們的心懷意念。」',
      WEB: '"Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God. And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus."',
      LSG: '« Ne vous inquiétez de rien; mais en toute chose faites connaître vos besoins à Dieu par des prières et des supplications, avec des actions de grâces. Et la paix de Dieu, qui surpasse toute intelligence, gardera vos cœurs et vos pensées en Jésus Christ. »',
    },
    reference: {
      CUV: '腓立比書 4:6-7',
      WEB: 'Philippians 4:6-7',
      LSG: 'Philippiens 4:6-7',
    },
  },
  {
    text: {
      CUV: '「所以，弟兄們，我以神的慈悲勸你們，將身體獻上，當作活祭，是聖潔的，是神所喜悅的；你們如此事奉乃是理所當然的。」',
      WEB: '"I beseech you therefore, brethren, by the mercies of God, that ye present your bodies a living sacrifice, holy, acceptable unto God, which is your reasonable service."',
      LSG: '« Je vous exhorte donc, frères, par les compassions de Dieu, à offrir vos corps comme un sacrifice vivant, saint, agréable à Dieu, ce qui sera de votre part un culte raisonnable. »',
    },
    reference: {
      CUV: '羅馬書 12:1',
      WEB: 'Romans 12:1',
      LSG: 'Romains 12:1',
    },
  },
  {
    text: {
      CUV: '「住在至高者隱密處的，必住在全能者的蔭下。我要論到耶和華說：他是我的避難所，是我的山寨，是我的神，是我所倚靠的。」',
      WEB: '"He that dwelleth in the secret place of the most High shall abide under the shadow of the Almighty. I will say of the LORD, He is my refuge and my fortress: my God; in him will I trust."',
      LSG: '« Celui qui demeure sous l\'abri du Très Haut Repose à l\'ombre du Tout Puissant. Je dis à l\'Éternel: Mon refuge et ma forteresse, Mon Dieu en qui je me confie! »',
    },
    reference: {
      CUV: '詩篇 91:1-2',
      WEB: 'Psalm 91:1-2',
      LSG: 'Psaume 91:1-2',
    },
  },
  {
    text: {
      CUV: '「耶穌說：『我就是道路、真理、生命；若不藉著我，沒有人能到父那裡去。』」',
      WEB: '"Jesus saith unto him, I am the way, the truth, and the life: no man cometh unto the Father, but by me."',
      LSG: '« Jésus lui dit: Je suis le chemin, la vérité, et la vie. Nul ne vient au Père que par moi. »',
    },
    reference: {
      CUV: '約翰福音 14:6',
      WEB: 'John 14:6',
      LSG: 'Jean 14:6',
    },
  },
  {
    text: {
      CUV: '「我留下平安給你們；我將我的平安賜給你們。我所賜的，不像世人所賜的。你們心裡不要憂愁，也不要膽怯。」',
      WEB: '"Peace I leave with you, my peace I give unto you: not as the world giveth, give I unto you. Let not your heart be troubled, neither let it be afraid."',
      LSG: '« Je vous laisse la paix, je vous donne ma paix. Je ne vous donne pas comme le monde donne. Que votre cœur ne se trouble point, et ne s\'alarme point. »',
    },
    reference: {
      CUV: '約翰福音 14:27',
      WEB: 'John 14:27',
      LSG: 'Jean 14:27',
    },
  },
  {
    text: {
      CUV: '「因為我深信無論是死，是生，是天使，是掌權的，是有能的，是現在的事，或者是將來的事，是高處的，是低處的，是別的受造之物，都不能叫我們與神的愛隔絕；這愛是在我們的主基督耶穌裡的。」',
      WEB: '"For I am persuaded, that neither death, nor life, nor angels, nor principalities, nor powers, nor things present, nor things to come, Nor height, nor depth, nor any other creature, shall be able to separate us from the love of God, which is in Christ Jesus our Lord."',
      LSG: '« Car j\'ai l\'assurance que ni la mort ni la vie, ni les anges ni les dominations, ni les choses présentes ni les choses à venir, ni les puissances, ni la hauteur, ni la profondeur, ni aucune autre créature ne pourra nous séparer de l\'amour de Dieu manifesté en Jésus Christ notre Seigneur. »',
    },
    reference: {
      CUV: '羅馬書 8:38-39',
      WEB: 'Romans 8:38-39',
      LSG: 'Romains 8:38-39',
    },
  },
  {
    text: {
      CUV: '「耶和華說：我的意念非同你們的意念；我的道路非同你們的道路。天怎樣高過地，照樣，我的道路高過你們的道路；我的意念高過你們的意念。」',
      WEB: '"For my thoughts are not your thoughts, neither are your ways my ways, saith the LORD. For as the heavens are higher than the earth, so are my ways higher than your ways, and my thoughts than your thoughts."',
      LSG: '« Car mes pensées ne sont pas vos pensées, Et vos voies ne sont pas mes voies, Dit l\'Éternel. Autant les cieux sont élevés au-dessus de la terre, Autant mes voies sont élevées au-dessus de vos voies, Et mes pensées au-dessus de vos pensées. »',
    },
    reference: {
      CUV: '以賽亞書 55:8-9',
      WEB: 'Isaiah 55:8-9',
      LSG: 'Ésaïe 55:8-9',
    },
  },
  {
    text: {
      CUV: '「又要以耶和華為樂，他就將你心裡所求的賜給你。當將你的事交託耶和華，並倚靠他，他就必成全。」',
      WEB: '"Delight thyself also in the LORD; and he shall give thee the desires of thine heart. Commit thy way unto the LORD; trust also in him; and he shall bring it to pass."',
      LSG: '« Fais de l\'Éternel tes délices, Et il te donnera ce que ton cœur désire. Recommande ton sort à l\'Éternel, Mets en lui ta confiance, et il agira. »',
    },
    reference: {
      CUV: '詩篇 37:4-5',
      WEB: 'Psalm 37:4-5',
      LSG: 'Psaume 37:4-5',
    },
  },
  {
    text: {
      CUV: '「這是耶和華所定的日子，我們在其中要高興歡喜！」',
      WEB: '"This is the day which the LORD hath made; we will rejoice and be glad in it."',
      LSG: '« C\'est ici la journée que l\'Éternel a faite: Qu\'elle soit pour nous un sujet d\'allégresse et de joie! »',
    },
    reference: {
      CUV: '詩篇 118:24',
      WEB: 'Psalm 118:24',
      LSG: 'Psaume 118:24',
    },
  },
  {
    text: {
      CUV: '「神啊，求你為我造清潔的心，使我裡面重新有正直的靈。」',
      WEB: '"Create in me a clean heart, O God; and renew a right spirit within me."',
      LSG: '« O Dieu! crée en moi un cœur pur, Renouvelle en moi un esprit bien disposé. »',
    },
    reference: {
      CUV: '詩篇 51:10',
      WEB: 'Psalm 51:10',
      LSG: 'Psaume 51:10',
    },
  },
  {
    text: {
      CUV: '「所以，我們只管坦然無懼的來到施恩的寶座前，為要得憐恤，蒙恩惠，作隨時的幫助。」',
      WEB: '"Let us therefore come boldly unto the throne of grace, that we may obtain mercy, and find grace to help in time of need."',
      LSG: '« Approchons-nous donc avec assurance du trône de la grâce, afin d\'obtenir miséricorde et de trouver grâce, pour être secourus dans nos besoins. »',
    },
    reference: {
      CUV: '希伯來書 4:16',
      WEB: 'Hebrews 4:16',
      LSG: 'Hébreux 4:16',
    },
  },
  {
    text: {
      CUV: '「神要擦去他們一切的眼淚；不再有死亡，也不再有悲哀、哭號、疼痛，因為以前的事都過去了。」',
      WEB: '"And God shall wipe away all tears from their eyes; and there shall be no more death, neither sorrow, nor crying, neither shall there be any more pain: for the former things are passed away."',
      LSG: '« Il essuiera toute larme de leurs yeux, et la mort ne sera plus, et il n\'y aura plus ni deuil, ni cri, ni douleur, car les premières choses ont disparu. »',
    },
    reference: {
      CUV: '啟示錄 21:4',
      WEB: 'Revelation 21:4',
      LSG: 'Apocalypse 21:4',
    },
  },
];

/**
 * Returns a deterministic Verse of the Day based on the current date YYYY-MM-DD.
 * By default uses CUV (Chinese Union Version / 和合本).
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
 * By default uses CUV (Chinese Union Version / 和合本).
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

/**
 * Formats a verse reference string for SpeechSynthesis so chapter:verse numbers
 * (e.g., "詩篇 23:1") are read naturally as "詩篇第23篇第1節" instead of time formats ("23點01分").
 */
export function formatReferenceForSpeech(ref: string, version: BibleVersion = 'CUV'): string {
  if (!ref) return '';

  const match = ref.match(/(\d+):(\d+)(?:-(\d+))?/);
  if (!match) return ref;

  const chapter = match[1];
  const startVerse = match[2];
  const endVerse = match[3];

  if (version === 'CUV' || /[\u4e00-\u9fa5]/.test(ref)) {
    // Chinese format: Extract Chinese book name
    const chineseBookMatch = ref.match(/^[\u4e00-\u9fa5]+/);
    const bookName = chineseBookMatch ? chineseBookMatch[0] : ref.split(/\s+\d+/)[0] || '';
    const isPsalm = bookName.includes('詩篇');
    const chapterUnit = isPsalm ? '篇' : '章';

    const versePart = endVerse
      ? `第${chapter}${chapterUnit}第${startVerse}至${endVerse}節`
      : `第${chapter}${chapterUnit}第${startVerse}節`;

    return `${bookName}${versePart}`;
  } else if (version === 'LSG') {
    // French format
    const bookName = ref.split(/\s+\d+:/)[0] || '';
    const isPsalm = bookName.toLowerCase().includes('psaume');
    const chapterWord = isPsalm ? 'psaume' : 'chapitre';
    const versePart = endVerse
      ? `${chapterWord} ${chapter} versets ${startVerse} à ${endVerse}`
      : `${chapterWord} ${chapter} verset ${startVerse}`;

    return `${bookName} ${versePart}`;
  } else {
    // English / WEB format
    const bookName = ref.split(/\s+\d+:/)[0] || '';
    const isPsalm = bookName.toLowerCase().includes('psalm');
    const chapterWord = isPsalm ? 'psalm' : 'chapter';
    const versePart = endVerse
      ? `${chapterWord} ${chapter} verses ${startVerse} to ${endVerse}`
      : `${chapterWord} ${chapter} verse ${startVerse}`;

    return `${bookName} ${versePart}`;
  }
}

/**
 * Corrects Chinese pronunciation issues for SpeechSynthesis TTS.
 * Fixes "地" being incorrectly pronounced as "de" (的) when used as noun/location (earth/land).
 * Replaces "地" with "帝" in TTS spoken text only, so TTS engines pronounce "dì" (第4聲).
 * Visual text remains untouched.
 */
export function fixChineseTTSPronunciation(text: string): string {
  if (!text) return '';
  return text.replace(/地/g, '帝');
}
