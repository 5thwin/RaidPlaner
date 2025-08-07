
import RaidGroup from '@/components/raids/RaidGroup';
import { RAIDS } from '@/data/raids';
import { SAMPLE_SERVER_RAID_DATA } from '@/data/sample';

export default function RaidList() {
  const visibleList = SAMPLE_SERVER_RAID_DATA.visible;
  return <div className='flex flex-col'>
    {RAIDS.map(
      (raid) => {
        const raidId = raid.id;
        return RaidGroup({ raidInfo: raid })
      }
    )}

  </div>
}
