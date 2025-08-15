// Mock D3 for Jest tests
export const forceSimulation = jest.fn(() => ({
  force: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
  stop: jest.fn(),
}));

export const forceLink = jest.fn(() => ({
  id: jest.fn().mockReturnThis(),
  distance: jest.fn().mockReturnThis(),
  strength: jest.fn().mockReturnThis(),
}));

export const forceManyBody = jest.fn(() => ({
  strength: jest.fn().mockReturnThis(),
}));

export const forceCenter = jest.fn(() => ({}));
export const forceCollide = jest.fn(() => ({
  radius: jest.fn().mockReturnThis(),
}));

export const select = jest.fn(() => ({
  call: jest.fn(),
  transition: jest.fn().mockReturnThis(),
  duration: jest.fn().mockReturnThis(),
  on: jest.fn(),
}));

export const zoom = jest.fn(() => ({
  scaleExtent: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
  transform: jest.fn(),
}));

export const zoomIdentity = {};

export default {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  select,
  zoom,
  zoomIdentity,
};
