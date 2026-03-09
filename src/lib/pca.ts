// Simple PCA for dimensionality reduction (n << d case)
// Uses the Gram matrix approach: compute n×n matrix instead of d×d

export function reduceTo2D(
  embeddings: number[][]
): { x: number; y: number }[] {
  const coords3d = reduceTo3D(embeddings);
  return coords3d.map((c) => ({ x: c.x, y: c.y }));
}

export function reduceTo3D(
  embeddings: number[][]
): { x: number; y: number; z: number }[] {
  const n = embeddings.length;
  if (n === 0) return [];
  if (n === 1) return [{ x: 0, y: 0, z: 0 }];
  if (n === 2) return [{ x: -0.5, y: 0, z: 0 }, { x: 0.5, y: 0, z: 0 }];

  const d = embeddings[0].length;

  // Center the data
  const mean = new Array(d).fill(0);
  for (const emb of embeddings) {
    for (let j = 0; j < d; j++) mean[j] += emb[j];
  }
  for (let j = 0; j < d; j++) mean[j] /= n;

  const centered = embeddings.map((emb) => emb.map((v, j) => v - mean[j]));

  // Compute n×n Gram matrix G = X * X^T
  const G: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      let dot = 0;
      for (let k = 0; k < d; k++) dot += centered[i][k] * centered[j][k];
      G[i][j] = dot;
      G[j][i] = dot;
    }
  }

  // Power iteration to find top 3 eigenvectors
  const numComponents = Math.min(3, n);
  const eigenvectors: number[][] = [];

  for (let ev = 0; ev < numComponents; ev++) {
    let v = Array.from({ length: n }, () => Math.random() - 0.5);
    let norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    v = v.map((x) => x / norm);

    for (let iter = 0; iter < 200; iter++) {
      // w = G * v
      const w = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          w[i] += G[i][j] * v[j];
        }
      }

      // Deflate: remove projection onto previous eigenvectors
      for (const prev of eigenvectors) {
        const proj = w.reduce((s, x, i) => s + x * prev[i], 0);
        for (let i = 0; i < n; i++) w[i] -= proj * prev[i];
      }

      // Normalize
      norm = Math.sqrt(w.reduce((s, x) => s + x * x, 0));
      if (norm < 1e-10) {
        v = Array.from({ length: n }, () => Math.random() - 0.5);
        norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
        v = v.map((x) => x / norm);
        continue;
      }
      v = w.map((x) => x / norm);
    }

    eigenvectors.push(v);
  }

  // Pad to 3 if we have fewer eigenvectors
  while (eigenvectors.length < 3) {
    eigenvectors.push(new Array(n).fill(0));
  }

  // Scale each component to [-1, 1] range
  const coords = eigenvectors.map((ev) => {
    const max = Math.max(...ev.map(Math.abs));
    return max > 0 ? ev.map((x) => x / max) : ev;
  });

  return Array.from({ length: n }, (_, i) => ({
    x: coords[0][i],
    y: coords[1][i],
    z: coords[2][i],
  }));
}
