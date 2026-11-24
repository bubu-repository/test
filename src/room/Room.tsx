import { useEffect } from 'react';
import { markRoomMounted } from '@/journey';
export default function Room() {
  useEffect(() => markRoomMounted(), []);
  return <div className="room"><div className="room-stage" /></div>;
}
