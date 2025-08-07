import viteLogo from '/vite.svg'
import './App.css'
import RaidList from './components/raids/RaidList'

function App() {

  return (
    <main className='flex flex-col items-center '>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <RaidList />
    </main>
  )
}

export default App
