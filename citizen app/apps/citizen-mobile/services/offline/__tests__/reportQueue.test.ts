import { reportQueue } from '../reportQueue';

const sampleReport = {
  mediaUri: 'file:///pothole.jpg',
  mediaType: 'image' as const,
  hazardType: 'POTHOLE' as const,
  severity: 'HIGH' as const,
  latitude: 13.05,
  longitude: 80.21,
  locationText: 'Test Road, Chennai',
  clientTimestamp: new Date().toISOString(),
};

describe('reportQueue (offline report queueing — section 34)', () => {
  beforeEach(async () => {
    // The jest mock (see jest.setup.js) is a plain CommonJS export with no
    // `.default` — Babel's interop adds that wrapper for app code's
    // `import AsyncStorage from '...'`, but a raw `require()` here sees the
    // mock object itself.
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.clear();
  });

  it('starts empty', async () => {
    expect(await reportQueue.count()).toBe(0);
  });

  it('enqueues a report and lists it back with a generated queueId', async () => {
    await reportQueue.enqueue(sampleReport);
    const items = await reportQueue.list();
    expect(items).toHaveLength(1);
    expect(items[0].locationText).toBe('Test Road, Chennai');
    expect(items[0].queueId).toBeTruthy();
  });

  it('does not lose a report across multiple enqueues (section 34)', async () => {
    await reportQueue.enqueue(sampleReport);
    await reportQueue.enqueue({ ...sampleReport, locationText: 'Second Road' });
    expect(await reportQueue.count()).toBe(2);
  });

  it('removes a report by queueId once it has been successfully synced', async () => {
    await reportQueue.enqueue(sampleReport);
    const [queued] = await reportQueue.list();
    await reportQueue.remove(queued.queueId);
    expect(await reportQueue.count()).toBe(0);
  });
});
