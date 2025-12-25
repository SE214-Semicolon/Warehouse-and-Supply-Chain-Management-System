export class LocationCapacityExceeded extends Error {
  constructor(
    public capacity: number,
    public currentStored: number,
    public requested: number,
  ) {
    super('Location capacity exceeded');
    this.name = 'LocationCapacityExceeded';
  }
}
