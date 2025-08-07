//레이드 플래너에 필요한 정보
//메인화면에 띄울 해당 공대가 도는 레이드 정보

export type ParticipantCharactor = {
	charactorId: number;
	position: 'dealer' | 'supporter';
};
export type Room = {
	participant1: ParticipantCharactor | null;
	participant2: ParticipantCharactor | null;
	participant3: ParticipantCharactor | null;
	participant4: ParticipantCharactor | null;
	participant5: ParticipantCharactor | null;
	participant6: ParticipantCharactor | null;
	participant7: ParticipantCharactor | null;
	participant8: ParticipantCharactor | null;
};
export type PartyRaid = {
	visible: boolean;
	normal: Room[];
	hard: Room[];
	hell: Room[];
};
export const RAID = {
	visible: {
		valtan: false,
		biakiss: false,
		'kouku-saton': false,
		abrelshud: false,
		illiakan: false,
		kayangel: false,
		kamen: false,
		echidna: false,
		behemoth: false,
		act1: true,
		act2: true,
		act3: true,
		act4: true,
		denouement: true,
	},
};
