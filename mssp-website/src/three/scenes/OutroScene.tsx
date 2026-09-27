import { palette } from '../materials/shared'
import { Globe } from '../objects/Globe'
import { Glow } from '../objects/primitives'

/** Final station: a vast protected planet forming the horizon behind the footer. */
export function OutroScene({ samples = 52000 }: { samples?: number }) {
  return (
    <group>
      <Glow color={palette.blue} size={42} intensity={0.2} position={[0, -6, -16]} />
      <Glow color={palette.purple} size={20} intensity={0.14} position={[-8, 2, -14]} />
      <group position={[0, -14.4, -4]}>
        <Globe radius={12} samples={samples} dotScale={0.45} arcs={16} rotationSpeed={0.02} tilt={0.5} atmosphere={1} initialRotation={-0.6} />
      </group>
    </group>
  )
}
