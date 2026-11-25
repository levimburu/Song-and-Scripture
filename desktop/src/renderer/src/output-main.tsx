import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { DEFAULT_OUTPUT, type OutputState } from '../../shared/types'
import { SlideView } from './SlideView'
import './styles.css'

function OutputApp(): React.JSX.Element {
  const [state, setState] = useState<OutputState>(DEFAULT_OUTPUT)

  useEffect(() => {
    const off = window.api.onOutputState(setState)
    window.api.requestOutputState()
    return off
  }, [])

  return (
    <div className="output-root">
      <SlideView output={state} />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OutputApp />
  </StrictMode>
)
