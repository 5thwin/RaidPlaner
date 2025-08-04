export type Difficulty = 'Normal' | 'Hard' | 'Extreme';

export interface RaidInfo {
	id: string;
	name: string;
	gates: number;
	players: number;
	itemLevel: number; // 입장 컷
}

export const RAIDS: RaidInfo[] = [
	{ id: 'valtan', name: '발탄', gates: 2, players: 8, itemLevel: 1415 },
	{
		id: 'biakiss',
		name: '비아키스',
		gates: 3,
		players: 8,
		itemLevel: 1430,
	},
	{
		id: 'kakul-saydon',
		name: '쿠크세이튼',
		gates: 3,
		players: 4,
		itemLevel: 1475,
	},
	{
		id: 'abrelshud',
		name: '아브렐슈드',
		gates: 6,
		players: 8,
		itemLevel: 1490,
	},

	{
		id: 'illiakan',
		name: '일리아칸',
		gates: 3,
		players: 8,
		itemLevel: 1580,
	},
	{
		id: 'kayangel',
		name: '카양겔',
		gates: 3,
		players: 4,
		itemLevel: 1540,
	},
	{ id: 'kamen', name: '카멘', gates: 4, players: 8, itemLevel: 1610 },
	{
		id: 'echidna',
		name: '서막:에키드나',
		gates: 4,
		players: 8,
		itemLevel: 1620,
	},
	{
		id: 'behemoth',
		name: '베히모스',
		gates: 2,
		players: 16,
		itemLevel: 1640,
	},
	{ id: 'act1', name: '1막:에기르', gates: 2, players: 8, itemLevel: 1660 },
	{
		id: 'act2',
		name: '2막:아브렐슈드',
		gates: 2,
		players: 8,
		itemLevel: 1670,
	},
	{
		id: 'act3',
		name: '3막:모르둠',
		gates: 3,
		players: 8,
		itemLevel: 1680,
	},

	{
		id: 'act4',
		name: '4막:아르모체',
		gates: 2,
		players: 8,
		itemLevel: 1700,
	},
	{
		id: 'denouement',
		name: '종막:카제로스',
		gates: 2,
		players: 8,
		itemLevel: 1710,
	},
];
