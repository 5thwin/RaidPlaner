
import RaidGroup from '@/components/raids/RaidGroup';
import { RAIDS } from '@/data/raids';
import { SAMPLE_SERVER_RAID_DATA } from '@/data/sample';
import { getValue } from '@/utils/object';

export default function RaidList() {
  const visibleList = SAMPLE_SERVER_RAID_DATA.visible;
  return <div className='flex flex-col'>
    {RAIDS.map(
      (raid) => {
        const raidId = raid.id;
        const isVisible = getValue(visibleList, raidId);
        if (isVisible === false) return null;
        return RaidGroup({ raidInfo: raid })
      }
    )}

  </div>
}
