import { useState } from 'react'
import viteLogo from '/vite.svg'
import './App.css'
import { RAIDS } from './data/raids'
import RaidGroup from './components/raids/RaidGroup'

function App() {
  const [count, setCount] = useState(0)

  return (
    <main className='flex flex-col items-center '>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className='flex flex-col'>
        {RAIDS.map(
          (raid) => {
            return RaidGroup({ raidInfo: raid })
          }
        )}

      </div>
    </main>
  )
}

export default App
