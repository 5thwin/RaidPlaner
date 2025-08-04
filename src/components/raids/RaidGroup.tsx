import type { RaidInfo } from '../../data/raids'


type Props = {
  raidInfo: RaidInfo
}
export default function RaidGroup({ raidInfo }: Props) {
  return <div className='flex flex-col'>
    <div id={`raid-group-header-${raidInfo.id}`}>
      <p className='text-lg'>
        {raidInfo.name}
      </p>
      <div id={`raid-group-contents-${raidInfo.id}`} className='flex'>
        <div id={`${raidInfo.id}-normal`}></div>
        <div id={`${raidInfo.id}-normal`}></div>
      </div>
    </div>
  </div>
}
