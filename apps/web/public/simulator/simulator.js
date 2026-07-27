import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.1/+esm'
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.185.1/examples/jsm/controls/OrbitControls.js/+esm'

const TABLE = { length: 2.74, width: 1.525, height: 0.76, netHeight: 0.1525 }
const BALL_RADIUS = 0.02
const MASS = 0.0027
const AREA = Math.PI * BALL_RADIUS * BALL_RADIUS
const AIR_DENSITY = 1.225
const DRAG_COEFFICIENT = 0.47
const DRAG_FACTOR = 0.5 * AIR_DENSITY * DRAG_COEFFICIENT * AREA / MASS
const MAGNUS_FACTOR = 0.00055
const DT = 1 / 360
const MAX_TIME = 5.5

const palette = {
  background: 0x07111f,
  table: 0x155e75,
  tableEdge: 0xe6f7ff,
  net: 0xd7edf6,
  ball: 0xff8a3d,
  trajectory: [0x38bdf8, 0x22c55e, 0xf59e0b, 0xa78bfa],
  bounce: 0xfacc15,
  contact: 0xfb7185,
}

const ui = {
  canvas: document.querySelector('#viewport'),
  playButton: document.querySelector('#playButton'),
  restartButton: document.querySelector('#restartButton'),
  slowButton: document.querySelector('#slowButton'),
  timeline: document.querySelector('#timeline'),
  timeLabel: document.querySelector('#timeLabel'),
  phaseLabel: document.querySelector('#phaseLabel'),
  outcomeLabel: document.querySelector('#outcomeLabel'),
  preset: document.querySelector('#preset'),
  singleControls: document.querySelector('#singleControls'),
  speed: document.querySelector('#speed'),
  elevation: document.querySelector('#elevation'),
  direction: document.querySelector('#direction'),
  topspin: document.querySelector('#topspin'),
  sidespin: document.querySelector('#sidespin'),
  speedValue: document.querySelector('#speedValue'),
  elevationValue: document.querySelector('#elevationValue'),
  directionValue: document.querySelector('#directionValue'),
  topspinValue: document.querySelector('#topspinValue'),
  sidespinValue: document.querySelector('#sidespinValue'),
  scenarioHint: document.querySelector('#scenarioHint'),
  metricSpeed: document.querySelector('#metricSpeed'),
  metricSpin: document.querySelector('#metricSpin'),
  metricHeight: document.querySelector('#metricHeight'),
  metricNet: document.querySelector('#metricNet'),
  eventList: document.querySelector('#eventList'),
  cameraButtons: [...document.querySelectorAll('[data-camera]')],
}

const presets = {
  loop: { speed: 12, elevation: 10, direction: 4, topspin: 85, sidespin: 0, startZ: -0.24, startY: 0.96, restitution: 0.78, label: 'Forehand loop', hint: 'A brushing contact creates heavy topspin, making the ball dip onto the far side and kick forward after the bounce.' },
  push: { speed: 7.2, elevation: 7, direction: -3, topspin: -48, sidespin: 0, startZ: 0.2, startY: 0.91, restitution: 0.76, label: 'Backspin push', hint: 'Backspin partly counters the normal downward curve, then table friction makes the rebound slower and shorter.' },
  block: { speed: 10.5, elevation: 5, direction: 2, topspin: 28, sidespin: 0, startZ: -0.14, startY: 1.0, restitution: 0.8, label: 'Controlled block', hint: 'A compact block sends a flatter ball with moderate retained topspin and a predictable first bounce.' },
  serve: { speed: 7.8, elevation: -1, direction: 8, topspin: 36, sidespin: 62, startZ: -0.3, startY: 0.92, restitution: 0.77, label: 'Sidespin serve', hint: 'Vertical-axis spin curves the flight sideways. Adjust aim against the curve to bring the second bounce toward the target.' },
}

const drillShots = [
  { name: '1 · Backspin feed', directionSign: -1, speed: 7.3, elevation: 8, yaw: -3, topspin: -48, sidespin: 0, start: [1.16, 1.02, 0.18], endX: -1.18, restitution: 0.76 },
  { name: '2 · Forehand loop', directionSign: 1, speed: 12.4, elevation: 11, yaw: 5, topspin: 92, sidespin: 0, start: [-1.17, 0.98, -0.27], endX: 1.18, restitution: 0.79 },
  { name: '3 · Opponent block', directionSign: -1, speed: 10.3, elevation: 5, yaw: 4, topspin: 30, sidespin: 0, start: [1.17, 1.02, 0.28], endX: -1.18, restitution: 0.8 },
  { name: '4 · Backhand counter', directionSign: 1, speed: 12.8, elevation: 8, yaw: -7, topspin: 70, sidespin: -10, start: [-1.17, 1.0, 0.22], endX: 1.18, restitution: 0.8 },
]

const scene = new THREE.Scene()
scene.background = new THREE.Color(palette.background)
scene.fog = new THREE.Fog(palette.background, 5.5, 12)

const renderer = new THREE.WebGLRenderer({ canvas: ui.canvas, antialias: true, alpha: false })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.outputColorSpace = THREE.SRGBColorSpace

const camera = new THREE.PerspectiveCamera(45, 1, 0.02, 30)
camera.position.set(-3.45, 2.35, 3.2)

const controls = new OrbitControls(camera, ui.canvas)
controls.target.set(0, TABLE.height + 0.15, 0)
controls.enableDamping = true
controls.minDistance = 2.2
controls.maxDistance = 8
controls.maxPolarAngle = Math.PI * 0.49

scene.add(new THREE.HemisphereLight(0xbfe5ff, 0x132238, 1.7))
const keyLight = new THREE.DirectionalLight(0xffffff, 2.5)
keyLight.position.set(-3, 6, 2)
keyLight.castShadow = true
keyLight.shadow.mapSize.set(2048, 2048)
scene.add(keyLight)

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(18, 18),
  new THREE.MeshStandardMaterial({ color: 0x0a1624, roughness: 0.94, metalness: 0.02 }),
)
floor.rotation.x = -Math.PI / 2
floor.receiveShadow = true
scene.add(floor)

function addTable() {
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(TABLE.length, 0.045, TABLE.width),
    new THREE.MeshStandardMaterial({ color: palette.table, roughness: 0.64, metalness: 0.03 }),
  )
  top.position.y = TABLE.height - 0.0225
  top.castShadow = true
  top.receiveShadow = true
  scene.add(top)

  const lineMaterial = new THREE.LineBasicMaterial({ color: palette.tableEdge })
  const y = TABLE.height + 0.002
  const hx = TABLE.length / 2
  const hz = TABLE.width / 2
  const points = [
    [-hx, y, -hz], [hx, y, -hz], [hx, y, hz], [-hx, y, hz], [-hx, y, -hz],
    [-hx, y, 0], [hx, y, 0],
  ].map(([xv, yv, zv]) => new THREE.Vector3(xv, yv, zv))
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterial))

  const legMaterial = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.78 })
  for (const x of [-0.95, 0.95]) {
    for (const z of [-0.55, 0.55]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.71, 0.07), legMaterial)
      leg.position.set(x, 0.385, z)
      leg.castShadow = true
      scene.add(leg)
    }
  }

  const net = new THREE.Mesh(
    new THREE.PlaneGeometry(TABLE.width + 0.16, TABLE.netHeight),
    new THREE.MeshBasicMaterial({ color: palette.net, transparent: true, opacity: 0.48, side: THREE.DoubleSide, wireframe: true }),
  )
  net.rotation.y = Math.PI / 2
  net.position.set(0, TABLE.height + TABLE.netHeight / 2, 0)
  scene.add(net)

  const tape = new THREE.Mesh(
    new THREE.BoxGeometry(0.018, 0.012, TABLE.width + 0.18),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc }),
  )
  tape.position.set(0, TABLE.height + TABLE.netHeight, 0)
  scene.add(tape)

  const postGeometry = new THREE.CylinderGeometry(0.012, 0.012, TABLE.netHeight + 0.05, 12)
  for (const z of [-TABLE.width / 2 - 0.07, TABLE.width / 2 + 0.07]) {
    const post = new THREE.Mesh(postGeometry, new THREE.MeshStandardMaterial({ color: 0xd7edf6 }))
    post.position.set(0, TABLE.height + TABLE.netHeight / 2, z)
    scene.add(post)
  }
}
addTable()

const ball = new THREE.Mesh(
  new THREE.SphereGeometry(BALL_RADIUS, 24, 16),
  new THREE.MeshStandardMaterial({ color: palette.ball, roughness: 0.38, metalness: 0.02 }),
)
ball.castShadow = true
scene.add(ball)

const velocityArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 0.35, 0x38bdf8, 0.08, 0.045)
const spinArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(), 0.28, 0xf472b6, 0.07, 0.04)
scene.add(velocityArrow, spinArrow)

const trajectoryGroup = new THREE.Group()
const markerGroup = new THREE.Group()
scene.add(trajectoryGroup, markerGroup)

let simulation = { samples: [], events: [], duration: 0, outcome: '—', netClearance: null }
let playhead = 0
let playing = false
let playbackRate = 1
let lastFrame = performance.now()
let activeCamera = 'player'

function v3(x = 0, y = 0, z = 0) { return { x, y, z } }
function clone(v) { return v3(v.x, v.y, v.z) }
function add(a, b) { return v3(a.x + b.x, a.y + b.y, a.z + b.z) }
function scale(v, s) { return v3(v.x * s, v.y * s, v.z * s) }
function length(v) { return Math.hypot(v.x, v.y, v.z) }
function cross(a, b) { return v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x) }

function stateSample(time, position, velocity, omega, shotIndex, shotName) {
  return { time, position: clone(position), velocity: clone(velocity), omega: clone(omega), shotIndex, shotName }
}

function makeLaunch({ start, directionSign, speed, elevation, yaw, topspin, sidespin }) {
  const pitch = THREE.MathUtils.degToRad(elevation)
  const lateral = THREE.MathUtils.degToRad(yaw)
  const horizontal = speed * Math.cos(pitch)
  return {
    position: v3(start[0], start[1], start[2]),
    velocity: v3(
      directionSign * horizontal * Math.cos(lateral),
      speed * Math.sin(pitch),
      horizontal * Math.sin(lateral),
    ),
    omega: v3(0, sidespin * Math.PI * 2, -directionSign * topspin * Math.PI * 2),
  }
}

function acceleration(velocity, omega) {
  const speed = length(velocity)
  const drag = speed > 0.0001 ? scale(velocity, -DRAG_FACTOR * speed) : v3()
  const magnus = scale(cross(omega, velocity), MAGNUS_FACTOR)
  return add(v3(0, -9.81, 0), add(drag, magnus))
}

function crossed(a, b, plane) {
  return (a <= plane && b >= plane) || (a >= plane && b <= plane)
}

function simulateSegment(config, shotIndex, startTime, stopAtContact = false) {
  const initial = makeLaunch(config)
  let position = initial.position
  let velocity = initial.velocity
  let omega = initial.omega
  let localTime = 0
  let bounceCount = 0
  let netHit = false
  let outcome = 'In flight'
  let netClearance = null
  const samples = [stateSample(startTime, position, velocity, omega, shotIndex, config.name)]
  const events = [{ type: 'contact', title: config.name, detail: `${config.speed.toFixed(1)} m/s · ${Math.round(config.topspin)} rps top/back spin`, time: startTime, position: clone(position), shotIndex }]

  for (let step = 0; step < MAX_TIME / DT; step += 1) {
    const previous = clone(position)
    const a = acceleration(velocity, omega)
    velocity = add(velocity, scale(a, DT))
    position = add(position, scale(velocity, DT))
    omega = scale(omega, Math.exp(-0.12 * DT))
    localTime += DT

    if (crossed(previous.x, position.x, 0)) {
      const ratio = Math.abs(position.x - previous.x) < 1e-9 ? 0 : Math.abs(previous.x) / Math.abs(position.x - previous.x)
      const netY = previous.y + (position.y - previous.y) * ratio
      const netZ = previous.z + (position.z - previous.z) * ratio
      const clearance = netY - (TABLE.height + TABLE.netHeight + BALL_RADIUS)
      netClearance = netClearance === null ? clearance : Math.min(netClearance, clearance)
      if (!netHit && Math.abs(netZ) <= TABLE.width / 2 + BALL_RADIUS && clearance < 0 && netY >= TABLE.height - BALL_RADIUS) {
        netHit = true
        position.x = config.directionSign * -BALL_RADIUS
        velocity.x *= -0.16
        velocity.y *= 0.48
        velocity.z *= 0.72
        events.push({ type: 'net', title: 'Net contact', detail: `${Math.abs(clearance * 100).toFixed(1)} cm below the tape`, time: startTime + localTime, position: clone(position), shotIndex })
        outcome = 'Net contact'
      }
    }

    const tablePlane = TABLE.height + BALL_RADIUS
    const onTable = Math.abs(position.x) <= TABLE.length / 2 + BALL_RADIUS && Math.abs(position.z) <= TABLE.width / 2 + BALL_RADIUS
    if (previous.y > tablePlane && position.y <= tablePlane && velocity.y < 0 && onTable) {
      position.y = tablePlane
      velocity.y = -velocity.y * config.restitution
      velocity.x += -omega.z * BALL_RADIUS * 0.042
      velocity.z *= 0.985
      velocity.x *= 0.992
      omega.z *= 0.84
      omega.y *= 0.94
      bounceCount += 1
      events.push({ type: 'bounce', title: `Table bounce ${bounceCount}`, detail: `x ${position.x.toFixed(2)} m · z ${position.z.toFixed(2)} m`, time: startTime + localTime, position: clone(position), shotIndex })
      outcome = bounceCount === 1 ? 'Landed on table' : 'Second bounce'
    }

    if (step % 3 === 0) samples.push(stateSample(startTime + localTime, position, velocity, omega, shotIndex, config.name))

    if (stopAtContact && bounceCount >= 1) {
      const reached = config.directionSign > 0 ? position.x >= config.endX : position.x <= config.endX
      if (reached && position.y > TABLE.height + 0.04) {
        events.push({ type: 'ready', title: 'Next racket contact', detail: 'Incoming state becomes the next shot input', time: startTime + localTime, position: clone(position), shotIndex })
        outcome = 'Returned to player'
        break
      }
    }

    if (position.y <= BALL_RADIUS) {
      position.y = BALL_RADIUS
      samples.push(stateSample(startTime + localTime, position, velocity, omega, shotIndex, config.name))
      if (bounceCount === 0 && !netHit) outcome = 'Missed table'
      else if (bounceCount > 0) outcome = 'Rally segment complete'
      break
    }

    if (Math.abs(position.x) > 3.15 || Math.abs(position.z) > 2.15 || localTime >= MAX_TIME) {
      if (bounceCount === 0 && !netHit) outcome = 'Long or wide'
      break
    }
  }

  return { samples, events, duration: localTime, outcome, netClearance }
}

function buildSimulation() {
  const isDrill = ui.preset.value === 'drill'
  const allSamples = []
  const allEvents = []
  let elapsed = 0
  let outcome = '—'
  let netClearance = null

  if (isDrill) {
    drillShots.forEach((shot, index) => {
      const segment = simulateSegment(shot, index, elapsed, index < drillShots.length - 1)
      allSamples.push(...segment.samples)
      allEvents.push(...segment.events)
      elapsed += segment.duration + (index < drillShots.length - 1 ? 0.14 : 0)
      outcome = segment.outcome
      if (segment.netClearance !== null) netClearance = netClearance === null ? segment.netClearance : Math.min(netClearance, segment.netClearance)
    })
    outcome = 'Four-ball drill complete'
  } else {
    const selectedPreset = presets[ui.preset.value]
    const config = {
      name: selectedPreset.label,
      directionSign: 1,
      speed: Number(ui.speed.value),
      elevation: Number(ui.elevation.value),
      yaw: Number(ui.direction.value),
      topspin: Number(ui.topspin.value),
      sidespin: Number(ui.sidespin.value),
      start: [-1.18, selectedPreset.startY, selectedPreset.startZ],
      restitution: selectedPreset.restitution,
      endX: 1.18,
    }
    const segment = simulateSegment(config, 0, 0, false)
    allSamples.push(...segment.samples)
    allEvents.push(...segment.events)
    elapsed = segment.duration
    outcome = segment.outcome
    netClearance = segment.netClearance
  }

  simulation = { samples: allSamples, events: allEvents, duration: Math.max(elapsed, 0.01), outcome, netClearance }
  playhead = 0
  playing = false
  ui.playButton.textContent = 'Play'
  ui.timeline.value = '0'
  rebuildTrajectory()
  renderEvents()
  updateAtTime(0)
}

function rebuildTrajectory() {
  trajectoryGroup.clear()
  markerGroup.clear()
  const byShot = new Map()
  simulation.samples.forEach((sample) => {
    if (!byShot.has(sample.shotIndex)) byShot.set(sample.shotIndex, [])
    byShot.get(sample.shotIndex).push(new THREE.Vector3(sample.position.x, sample.position.y, sample.position.z))
  })
  byShot.forEach((points, index) => {
    if (points.length < 2) return
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: palette.trajectory[index % palette.trajectory.length], transparent: true, opacity: 0.86 }))
    trajectoryGroup.add(line)
  })

  simulation.events.forEach((event) => {
    if (event.type !== 'bounce' && event.type !== 'contact' && event.type !== 'net') return
    const color = event.type === 'bounce' ? palette.bounce : event.type === 'net' ? 0xef4444 : palette.contact
    const radius = event.type === 'contact' ? 0.035 : 0.027
    const marker = new THREE.Mesh(new THREE.SphereGeometry(radius, 14, 10), new THREE.MeshBasicMaterial({ color }))
    marker.position.set(event.position.x, event.position.y, event.position.z)
    markerGroup.add(marker)
  })
}

function renderEvents() {
  ui.eventList.replaceChildren()
  simulation.events.slice(0, 12).forEach((event) => {
    const item = document.createElement('li')
    item.className = 'event'
    const dot = document.createElement('span')
    dot.className = 'dot'
    if (event.type === 'bounce') dot.style.background = '#facc15'
    if (event.type === 'net') dot.style.background = '#fb7185'
    if (event.type === 'ready') dot.style.background = '#22c55e'
    const text = document.createElement('div')
    const title = document.createElement('div')
    title.className = 'event-title'
    title.textContent = event.title
    const detail = document.createElement('div')
    detail.className = 'event-sub'
    detail.textContent = event.detail
    text.append(title, detail)
    const time = document.createElement('span')
    time.className = 'event-time'
    time.textContent = `${event.time.toFixed(2)}s`
    item.append(dot, text, time)
    ui.eventList.append(item)
  })
}

function sampleAt(time) {
  const samples = simulation.samples
  if (!samples.length) return null
  if (time <= samples[0].time) return samples[0]
  if (time >= samples[samples.length - 1].time) return samples[samples.length - 1]
  let low = 0
  let high = samples.length - 1
  while (low + 1 < high) {
    const mid = Math.floor((low + high) / 2)
    if (samples[mid].time <= time) low = mid
    else high = mid
  }
  const a = samples[low]
  const b = samples[high]
  const span = Math.max(b.time - a.time, 1e-6)
  const f = Math.min(1, Math.max(0, (time - a.time) / span))
  const lerp = (av, bv) => av + (bv - av) * f
  return {
    time,
    position: v3(lerp(a.position.x, b.position.x), lerp(a.position.y, b.position.y), lerp(a.position.z, b.position.z)),
    velocity: v3(lerp(a.velocity.x, b.velocity.x), lerp(a.velocity.y, b.velocity.y), lerp(a.velocity.z, b.velocity.z)),
    omega: v3(lerp(a.omega.x, b.omega.x), lerp(a.omega.y, b.omega.y), lerp(a.omega.z, b.omega.z)),
    shotIndex: f < 0.5 ? a.shotIndex : b.shotIndex,
    shotName: f < 0.5 ? a.shotName : b.shotName,
  }
}

function updateAtTime(time) {
  const current = sampleAt(time)
  if (!current) return
  ball.position.set(current.position.x, current.position.y, current.position.z)
  const speed = length(current.velocity)
  const spin = length(current.omega) / (Math.PI * 2)
  ball.rotation.x += current.omega.x * 0.00045
  ball.rotation.y += current.omega.y * 0.00045
  ball.rotation.z += current.omega.z * 0.00045

  const velocityDirection = new THREE.Vector3(current.velocity.x, current.velocity.y, current.velocity.z)
  if (velocityDirection.lengthSq() > 0.0001) velocityDirection.normalize()
  velocityArrow.position.copy(ball.position)
  velocityArrow.setDirection(velocityDirection)
  velocityArrow.setLength(Math.min(0.48, 0.12 + speed * 0.018), 0.07, 0.04)

  const spinDirection = new THREE.Vector3(current.omega.x, current.omega.y, current.omega.z)
  if (spinDirection.lengthSq() > 0.0001) spinDirection.normalize()
  else spinDirection.set(0, 0, 1)
  spinArrow.position.copy(ball.position)
  spinArrow.setDirection(spinDirection)
  spinArrow.setLength(Math.min(0.4, 0.12 + spin * 0.0022), 0.065, 0.035)

  ui.phaseLabel.textContent = current.shotName
  ui.metricSpeed.textContent = `${speed.toFixed(1)} m/s`
  ui.metricSpin.textContent = `${Math.round(spin)} rps`
  ui.metricHeight.textContent = `${Math.max(0, (current.position.y - TABLE.height) * 100).toFixed(0)} cm`
  ui.metricNet.textContent = simulation.netClearance === null ? '—' : `${simulation.netClearance >= 0 ? '+' : ''}${(simulation.netClearance * 100).toFixed(1)} cm`
  ui.timeLabel.textContent = `${time.toFixed(2)} / ${simulation.duration.toFixed(2)} s`
  ui.timeline.value = String(Math.round(time / simulation.duration * 1000))

  const finished = time >= simulation.duration - 0.005
  ui.outcomeLabel.textContent = finished ? simulation.outcome : 'Simulating flight'
  ui.outcomeLabel.className = `overlay-value ${simulation.outcome.includes('Net') || simulation.outcome.includes('Missed') || simulation.outcome.includes('Long') ? 'status-bad' : finished ? 'status-good' : ''}`
}

function applyPreset(name) {
  const isDrill = name === 'drill'
  ui.singleControls.style.display = isDrill ? 'none' : ''
  if (!isDrill) {
    const preset = presets[name]
    ui.speed.value = preset.speed
    ui.elevation.value = preset.elevation
    ui.direction.value = preset.direction
    ui.topspin.value = preset.topspin
    ui.sidespin.value = preset.sidespin
    ui.scenarioHint.textContent = preset.hint
  } else {
    ui.scenarioHint.textContent = 'The output of each simulated rally segment becomes the incoming state for the next named stroke, with a short pause at racket contact.'
  }
  updateLabels()
  buildSimulation()
}

function updateLabels() {
  ui.speedValue.textContent = `${Number(ui.speed.value).toFixed(1)} m/s`
  ui.elevationValue.textContent = `${ui.elevation.value}°`
  ui.directionValue.textContent = `${ui.direction.value}°`
  ui.topspinValue.textContent = `${ui.topspin.value} rps`
  ui.sidespinValue.textContent = `${ui.sidespin.value} rps`
}

function setCamera(name) {
  activeCamera = name
  const targets = {
    player: { position: [-3.45, 2.35, 3.2], target: [0, TABLE.height + 0.15, 0] },
    side: { position: [0, 2.05, 4.65], target: [0, TABLE.height + 0.12, 0] },
    top: { position: [0, 6.1, 0.01], target: [0, TABLE.height, 0] },
    free: { position: [3.2, 2.65, 3.6], target: [0, TABLE.height + 0.12, 0] },
  }
  const selected = targets[name]
  camera.position.fromArray(selected.position)
  controls.target.fromArray(selected.target)
  controls.enableRotate = name !== 'top'
  controls.update()
  ui.cameraButtons.forEach((button) => button.classList.toggle('active', button.dataset.camera === name))
}

function resize() {
  const width = ui.canvas.clientWidth
  const height = ui.canvas.clientHeight
  renderer.setSize(width, height, false)
  camera.aspect = width / Math.max(height, 1)
  camera.updateProjectionMatrix()
}

ui.playButton.addEventListener('click', () => {
  if (playhead >= simulation.duration - 0.005) playhead = 0
  playing = !playing
  ui.playButton.textContent = playing ? 'Pause' : 'Play'
})
ui.restartButton.addEventListener('click', () => {
  playhead = 0
  playing = true
  ui.playButton.textContent = 'Pause'
  updateAtTime(0)
})
ui.slowButton.addEventListener('click', () => {
  playbackRate = playbackRate === 1 ? 0.5 : 1
  ui.slowButton.textContent = playbackRate === 1 ? '½ speed' : 'Normal speed'
  ui.slowButton.classList.toggle('active', playbackRate === 0.5)
})
ui.timeline.addEventListener('input', () => {
  playhead = Number(ui.timeline.value) / 1000 * simulation.duration
  playing = false
  ui.playButton.textContent = 'Play'
  updateAtTime(playhead)
})
ui.preset.addEventListener('change', () => applyPreset(ui.preset.value))
for (const input of [ui.speed, ui.elevation, ui.direction, ui.topspin, ui.sidespin]) {
  input.addEventListener('input', () => {
    updateLabels()
    buildSimulation()
  })
}
ui.cameraButtons.forEach((button) => button.addEventListener('click', () => setCamera(button.dataset.camera)))
window.addEventListener('resize', resize)

function animate(now) {
  const delta = Math.min((now - lastFrame) / 1000, 0.05)
  lastFrame = now
  if (playing) {
    playhead += delta * playbackRate
    if (playhead >= simulation.duration) {
      playhead = simulation.duration
      playing = false
      ui.playButton.textContent = 'Replay'
    }
    updateAtTime(playhead)
  }
  controls.update()
  renderer.render(scene, camera)
  requestAnimationFrame(animate)
}

resize()
applyPreset('loop')
setCamera(activeCamera)
requestAnimationFrame(animate)
