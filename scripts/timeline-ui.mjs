export async function openTimeline(page, width) {
  if (width <= 800) await page.getByRole('button', {name: 'Abrir linha do tempo', exact: true}).click();
  const timeline = page.getByRole('navigation', {name: 'Relatórios', exact: true});
  await timeline.waitFor();
  return timeline;
}
