import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, MathUtils, Quaternion, SRGBColorSpace, TextureLoader, Vector3 } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { LiveOrbitData } from '../data/liveOrbits'

export type CelestialBody = 'moon' | 'sun' | 'earth'

type OrbitalSceneProps = {
  latitudeDeg: number
  longitudeDegEast: number
  sunAzimuthDeg: number
  sunElevationDeg: number
  earthAzimuthDeg: number
  earthElevationDeg: number
  earthRadiusDeg: number
  cameraDistance: number
  active: boolean
  selectedBody: CelestialBody | null
  onSelectBody: (body: CelestialBody) => void
  viewerMode: 'surface' | 'orbits'
  orbitData: LiveOrbitData | null
  resetViewKey: number
}

const moonTexturePath = '/textures/moon-lroc-wac-2k.webp'
const earthTexturePath = '/textures/earth-blue-marble-4k.webp'
const sunTexturePath = '/textures/sun-sdo-aia-171-equirect.webp'
const texturePaths = [moonTexturePath, earthTexturePath, sunTexturePath]

function unitVector(latitudeDeg: number, longitudeDegEast: number) {
  const latitude = MathUtils.degToRad(latitudeDeg)
  const longitude = MathUtils.degToRad(longitudeDegEast)
  return new Vector3(
    Math.cos(latitude) * Math.cos(longitude),
    Math.sin(latitude),
    -Math.cos(latitude) * Math.sin(longitude),
  ).normalize()
}

function localNorth(siteUp: Vector3) {
  const latitude = Math.asin(MathUtils.clamp(siteUp.y, -1, 1))
  const longitude = Math.atan2(-siteUp.z, siteUp.x)
  return new Vector3(-Math.sin(latitude) * Math.cos(longitude), Math.cos(latitude), Math.sin(latitude) * Math.sin(longitude)).normalize()
}

function localDirection(azimuthDeg: number, elevationDeg: number, siteUp: Vector3) {
  const azimuth = MathUtils.degToRad(azimuthDeg)
  const elevation = MathUtils.degToRad(elevationDeg)
  const longitude = Math.atan2(-siteUp.z, siteUp.x)
  const east = new Vector3(-Math.sin(longitude), 0, -Math.cos(longitude)).normalize()
  const north = localNorth(siteUp)
  return east.multiplyScalar(Math.sin(azimuth) * Math.cos(elevation))
    .add(north.multiplyScalar(Math.cos(azimuth) * Math.cos(elevation)))
    .add(siteUp.clone().multiplyScalar(Math.sin(elevation)))
    .normalize()
}

function SceneBodies({
  latitudeDeg,
  longitudeDegEast,
  sunAzimuthDeg,
  sunElevationDeg,
  earthAzimuthDeg,
  earthElevationDeg,
  earthRadiusDeg,
  selectedBody,
  onSelectBody,
}: OrbitalSceneProps) {
  const [moonTexture, earthTexture, sunTexture] = useLoader(TextureLoader, [moonTexturePath, earthTexturePath, sunTexturePath])
  useEffect(() => {
    moonTexture.colorSpace = SRGBColorSpace
    earthTexture.colorSpace = SRGBColorSpace
    sunTexture.colorSpace = SRGBColorSpace
    moonTexture.anisotropy = 8
    earthTexture.anisotropy = 8
    sunTexture.anisotropy = 4
    moonTexture.needsUpdate = true
    earthTexture.needsUpdate = true
    sunTexture.needsUpdate = true
  }, [moonTexture, earthTexture, sunTexture])

  const siteUp = useMemo(() => unitVector(latitudeDeg, longitudeDegEast), [latitudeDeg, longitudeDegEast])
  const sitePosition = useMemo(() => siteUp.clone().multiplyScalar(1.115), [siteUp])
  const sunDirection = useMemo(() => localDirection(sunAzimuthDeg, sunElevationDeg, siteUp), [sunAzimuthDeg, sunElevationDeg, siteUp])
  const earthDirection = useMemo(() => localDirection(earthAzimuthDeg, earthElevationDeg, siteUp), [earthAzimuthDeg, earthElevationDeg, siteUp])
  const sunPosition = useMemo(() => sitePosition.clone().addScaledVector(sunDirection, 3.05), [sitePosition, sunDirection])
  const earthPosition = useMemo(() => sitePosition.clone().addScaledVector(earthDirection, 3.35), [sitePosition, earthDirection])
  const horizonQuaternion = useMemo(() => new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), siteUp), [siteUp])
  const earthRadius = MathUtils.clamp(earthRadiusDeg * 0.11, 0.12, 0.25)

  return (
    <group>
      <ambientLight intensity={0.22} color="#a7b5c6" />
      <pointLight position={sunPosition.toArray()} intensity={78} distance={18} decay={1.8} color="#ffe1ad" />
      <mesh onClick={(event) => { event.stopPropagation(); onSelectBody('moon') }} onPointerOver={(event) => { event.stopPropagation(); document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = '' }}>
        <sphereGeometry args={[1.12, 96, 64]} />
        <meshStandardMaterial map={moonTexture} roughness={0.98} metalness={0} color="#e4e0d7" emissive={selectedBody === 'moon' ? '#28454d' : '#000000'} emissiveIntensity={0.7} />
      </mesh>

      <group position={sitePosition.toArray()}>
        <mesh scale={[0.026, 0.026, 0.026]}>
          <sphereGeometry args={[1, 18, 12]} />
          <meshBasicMaterial color="#75e3e8" />
        </mesh>
        <mesh position={siteUp.clone().multiplyScalar(0.025).toArray()} quaternion={horizonQuaternion}>
          <cylinderGeometry args={[0.006, 0.009, 0.065, 8]} />
          <meshBasicMaterial color="#ffbd58" />
        </mesh>
        <mesh position={siteUp.clone().multiplyScalar(0.063).toArray()}>
          <sphereGeometry args={[0.018, 12, 8]} />
          <meshBasicMaterial color="#fff0bf" />
        </mesh>
        <mesh position={siteUp.clone().multiplyScalar(0.015).toArray()} quaternion={horizonQuaternion}>
          <torusGeometry args={[0.38, 0.004, 8, 100]} />
          <meshBasicMaterial color="#9bd9e3" transparent opacity={0.42} />
        </mesh>
      </group>

      <group position={sunPosition.toArray()}>
        <mesh onClick={(event) => { event.stopPropagation(); onSelectBody('sun') }} onPointerOver={() => { document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = '' }}>
          <sphereGeometry args={[0.14, 48, 32]} />
          <meshStandardMaterial map={sunTexture} emissiveMap={sunTexture} emissive={new Color(selectedBody === 'sun' ? '#fff3ae' : '#ffe06a')} emissiveIntensity={selectedBody === 'sun' ? 2.2 : 1.7} roughness={0.72} />
        </mesh>
        <mesh scale={1.32}>
          <sphereGeometry args={[0.14, 32, 24]} />
          <meshBasicMaterial color="#ffb64f" transparent opacity={0.12} depthWrite={false} />
        </mesh>
      </group>

      <group position={earthPosition.toArray()}>
        <mesh onClick={(event) => { event.stopPropagation(); onSelectBody('earth') }} onPointerOver={() => { document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = '' }}>
          <sphereGeometry args={[earthRadius, 48, 32]} />
          <meshStandardMaterial map={earthTexture} roughness={0.98} metalness={0} color={selectedBody === 'earth' ? '#b8edf3' : '#dceaf2'} />
        </mesh>
        <mesh scale={1.12}>
          <sphereGeometry args={[earthRadius, 32, 24]} />
          <meshBasicMaterial color="#58b9e8" transparent opacity={0.11} depthWrite={false} />
        </mesh>
      </group>
    </group>
  )
}

function StarField() {
  const stars = useMemo(() => {
    const positions: number[] = []
    for (let index = 0; index < 360; index += 1) {
      const y = 1 - (index / 359) * 2
      const radius = Math.sqrt(1 - y * y)
      const angle = index * 2.399963
      positions.push(Math.cos(angle) * radius * 12, y * 12, Math.sin(angle) * radius * 12)
    }
    return new Float32Array(positions)
  }, [])
  return <points><bufferGeometry><bufferAttribute attach="attributes-position" args={[stars, 3]} /></bufferGeometry><pointsMaterial color="#d3deed" size={0.025} transparent opacity={0.52} sizeAttenuation /></points>
}

function TextureLifetime() {
  const textures = useLoader(TextureLoader, texturePaths)
  useEffect(() => () => {
    textures.forEach((texture) => texture.dispose())
    useLoader.clear(TextureLoader, texturePaths)
  }, [textures])
  return null
}

function CameraToSite({ latitudeDeg, longitudeDegEast, cameraDistance, viewerMode }: Pick<OrbitalSceneProps, 'latitudeDeg' | 'longitudeDegEast' | 'cameraDistance' | 'viewerMode'>) {
  const { camera, invalidate } = useThree()
  useEffect(() => {
    if (viewerMode === 'orbits') {
      camera.position.set(0, cameraDistance * 0.42, cameraDistance)
      camera.up.set(0, 1, 0)
    } else {
      const site = unitVector(latitudeDeg, longitudeDegEast)
      const north = localNorth(site)
      camera.position.copy(site.clone().multiplyScalar(cameraDistance).addScaledVector(north, 0.35))
      camera.up.copy(north)
    }
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
    invalidate()
  }, [camera, cameraDistance, invalidate, latitudeDeg, longitudeDegEast, viewerMode])
  return null
}

function CameraOrbit({ active, viewerMode, resetViewKey }: { active: boolean; viewerMode: OrbitalSceneProps['viewerMode']; resetViewKey: number }) {
  const { camera, gl, invalidate } = useThree()
  const controlsRef = useRef<OrbitControls | null>(null)
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.075
    controls.enablePan = true
    controls.enableZoom = true
    controls.rotateSpeed = 0.55
    controls.minDistance = 1.24
    controls.maxDistance = 20
    controls.maxPolarAngle = MathUtils.degToRad(158)
    controls.minPolarAngle = MathUtils.degToRad(18)
    controls.enabled = active
    const handleControlsChange = () => invalidate()
    controls.addEventListener('change', handleControlsChange)
    controls.update()
    controlsRef.current = controls
    return () => {
      controls.removeEventListener('change', handleControlsChange)
      controls.dispose()
      controlsRef.current = null
    }
  }, [camera, gl, invalidate])
  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return
    controls.enabled = active
    controls.screenSpacePanning = true
    controls.minDistance = viewerMode === 'orbits' ? 1.8 : 1.24
    controls.maxDistance = viewerMode === 'orbits' ? 18 : 9
    controls.target.set(0, 0, 0)
    controls.update()
  }, [active, resetViewKey, viewerMode])
  useFrame(() => {
    if (active) controlsRef.current?.update()
  })
  return null
}

function OrbitSystem({ data, onSelectBody, selectedBody }: {
  data: LiveOrbitData
  onSelectBody: OrbitalSceneProps['onSelectBody']
  selectedBody: CelestialBody | null
}) {
  const [moonTexture, earthTexture, sunTexture] = useLoader(TextureLoader, [moonTexturePath, earthTexturePath, sunTexturePath])
  const earthScale = 4.8
  const moonOrbitScale = 520
  const nearest = (points: LiveOrbitData['earthHeliocentric'], epoch: string) => points.reduce((best, point) => Math.abs(Date.parse(point.utc) - Date.parse(epoch)) < Math.abs(Date.parse(best.utc) - Date.parse(epoch)) ? point : best)
  const earthNow = nearest(data.earthHeliocentric, data.epochUtc)
  const moonNow = nearest(data.moonGeocentric, data.epochUtc)
  const earthPosition = useMemo(() => new Vector3(earthNow.xAu, earthNow.zAu, -earthNow.yAu).multiplyScalar(earthScale), [earthNow.xAu, earthNow.yAu, earthNow.zAu])
  const moonRelative = useMemo(() => new Vector3(moonNow.xAu, moonNow.zAu, -moonNow.yAu).multiplyScalar(moonOrbitScale), [moonNow.xAu, moonNow.yAu, moonNow.zAu])
  const moonPosition = useMemo(() => earthPosition.clone().add(moonRelative), [earthPosition, moonRelative])
  const earthPoints = useMemo(() => data.earthHeliocentric.map((point) => new Vector3(point.xAu, point.zAu, -point.yAu).multiplyScalar(earthScale)), [data.earthHeliocentric])
  const moonPoints = useMemo(() => data.moonGeocentric.map((point) => earthPosition.clone().add(new Vector3(point.xAu, point.zAu, -point.yAu).multiplyScalar(moonOrbitScale))), [data.moonGeocentric, earthPosition])
  useEffect(() => {
    moonTexture.colorSpace = SRGBColorSpace
    earthTexture.colorSpace = SRGBColorSpace
    sunTexture.colorSpace = SRGBColorSpace
  }, [moonTexture, earthTexture, sunTexture])

  return (
    <group>
      <ambientLight intensity={0.55} color="#b4c7dc" />
      <pointLight position={[0, 0, 0]} intensity={100} distance={40} decay={1.5} color="#ffe2b1" />
      <line><bufferGeometry><bufferAttribute attach="attributes-position" args={[new Float32Array(earthPoints.flatMap((point) => point.toArray())), 3]} /></bufferGeometry><lineBasicMaterial color="#f4bd68" transparent opacity={0.52} /></line>
      <line><bufferGeometry><bufferAttribute attach="attributes-position" args={[new Float32Array(moonPoints.flatMap((point) => point.toArray())), 3]} /></bufferGeometry><lineBasicMaterial color="#9bd9e3" transparent opacity={0.72} /></line>
      <mesh onClick={() => onSelectBody('sun')}><sphereGeometry args={[0.4, 32, 24]} /><meshBasicMaterial map={sunTexture} color="#ffe0a5" /></mesh>
      <mesh position={earthPosition.toArray()} onClick={() => onSelectBody('earth')}><sphereGeometry args={[0.17, 32, 24]} /><meshStandardMaterial map={earthTexture} roughness={0.95} /></mesh>
      <mesh position={moonPosition.toArray()} onClick={() => onSelectBody('moon')}><sphereGeometry args={[0.105, 36, 24]} /><meshStandardMaterial map={moonTexture} roughness={0.98} emissive={selectedBody === 'moon' ? '#28454d' : '#000000'} emissiveIntensity={0.6} /></mesh>
    </group>
  )
}

export default function OrbitalScene(props: OrbitalSceneProps) {
  const site = useMemo(() => unitVector(props.latitudeDeg, props.longitudeDegEast), [props.latitudeDeg, props.longitudeDegEast])
  const cameraNorth = useMemo(() => localNorth(site), [site])
  const cameraPosition = useMemo(() => site.clone().multiplyScalar(props.cameraDistance).addScaledVector(cameraNorth, 0.35), [site, cameraNorth, props.cameraDistance])

  return (
    <Canvas
      camera={{ position: cameraPosition.toArray(), fov: 34, near: 0.1, far: 50 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      frameloop={props.active ? 'always' : 'demand'}
    >
      <color attach="background" args={['#090d12']} />
      <fog attach="fog" args={['#090d12', 9, 19]} />
      <TextureLifetime />
      <CameraToSite latitudeDeg={props.latitudeDeg} longitudeDegEast={props.longitudeDegEast} cameraDistance={props.cameraDistance} viewerMode={props.viewerMode} />
      <CameraOrbit active={props.active} viewerMode={props.viewerMode} resetViewKey={props.resetViewKey} />
      <StarField />
      {props.viewerMode === 'orbits'
        ? props.orbitData ? <OrbitSystem data={props.orbitData} onSelectBody={props.onSelectBody} selectedBody={props.selectedBody} /> : null
        : <SceneBodies {...props} />}
    </Canvas>
  )
}
