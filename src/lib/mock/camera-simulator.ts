/**
 * Renders an animated mock CCTV frame onto a 2D canvas context.
 * Used only when mock mode is active so the UI has a live-looking feed
 * without a backend camera or CARLA simulator.
 */
export function drawCameraFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeMs: number,
) {
  const t = timeMs / 1000;

  // Bright daylight sky
  ctx.fillStyle = "#93c5fd";
  ctx.fillRect(0, 0, width, height);

  // Perspective ground (concrete industrial yard)
  const horizon = height * 0.42;
  const grad = ctx.createLinearGradient(0, horizon, 0, height);
  grad.addColorStop(0, "#64748b");
  grad.addColorStop(1, "#334155");
  ctx.fillStyle = grad;
  ctx.fillRect(0, horizon, width, height - horizon);

  // Lane markings converging to center
  ctx.strokeStyle = "rgba(224, 179, 65, 0.35)";
  ctx.lineWidth = 2;
  for (const offset of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(width / 2 + offset * width * 0.16, horizon);
    ctx.lineTo(width / 2 + offset * width * 0.42, height);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(width / 2, horizon);
  ctx.lineTo(width / 2, height);
  ctx.setLineDash([14, 16]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Gate structure
  ctx.strokeStyle = "rgba(90, 169, 230, 0.55)";
  ctx.lineWidth = 4;
  ctx.strokeRect(width * 0.18, height * 0.2, width * 0.64, height * 0.34);
  ctx.fillStyle = "rgba(90, 169, 230, 0.08)";
  ctx.fillRect(width * 0.18, height * 0.2, width * 0.64, height * 0.34);

  // Moving car (loops)
  const progress = (t % 6) / 6;
  const carX = width * 0.2 + progress * width * 0.6;
  const carY = horizon + progress * (height - horizon) * 0.55;
  const carW = width * (0.05 + progress * 0.06);
  const carH = carW * 0.55;
  ctx.fillStyle = "rgba(90, 194, 122, 0.85)";
  ctx.fillRect(carX - carW / 2, carY - carH / 2, carW, carH);
  ctx.fillStyle = "rgba(230, 233, 238, 0.75)";
  ctx.fillRect(carX - carW * 0.32, carY - carH * 0.36, carW * 0.64, carH * 0.3);

  // Scanline sweep
  const sweepY = ((t * 0.4) % 1) * height;
  const sweep = ctx.createLinearGradient(0, sweepY - 40, 0, sweepY + 40);
  sweep.addColorStop(0, "rgba(90, 194, 122, 0)");
  sweep.addColorStop(0.5, "rgba(90, 194, 122, 0.10)");
  sweep.addColorStop(1, "rgba(90, 194, 122, 0)");
  ctx.fillStyle = sweep;
  ctx.fillRect(0, sweepY - 40, width, 80);

  // HUD text
  ctx.font = "13px 'JetBrains Mono', monospace";
  ctx.fillStyle = "rgba(230, 233, 238, 0.85)";
  ctx.fillText("CAM-GATE-01 · Town04", 14, 24);
  ctx.fillStyle = "rgba(242, 100, 90, 0.95)";
  ctx.fillText("● REC", 14, 44);
  const stamp = new Date(timeMs).toISOString().slice(11, 19);
  ctx.fillStyle = "rgba(230, 233, 238, 0.7)";
  ctx.fillText(`${stamp} UTC`, 14, height - 14);
  ctx.fillStyle = "rgba(139, 145, 153, 0.8)";
  ctx.fillText("1280x720 · ~20 FPS · MOCK", width - 220, height - 14);
}
