import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import VoiceButton from '../features/voice/VoiceButton'

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 pt-6 pb-24">
        <Outlet />
      </main>

      {/* Voice Assistant Button */}
      <VoiceButton />

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  )
}
