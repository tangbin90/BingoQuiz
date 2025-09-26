import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '../types';

class SocketManager {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private isAdmin = false;
  private isConnecting = false;

  connect(): Socket<ServerToClientEvents, ClientToServerEvents> {
    console.log('🔌 SocketManager.connect called, isConnecting:', this.isConnecting, 'isConnected:', this.isConnected(), 'isAdmin:', this.isAdmin);
    
    // 如果正在连接中，返回现有连接
    if (this.isConnecting) {
      console.log('🔌 Already connecting, returning existing socket');
      return this.socket!;
    }

    // 如果已经连接，直接返回现有连接
    if (this.socket?.connected) {
      console.log('🔌 Already connected, returning existing socket');
      return this.socket;
    }

    // 如果已有连接，先断开
    if (this.socket) {
      this.socket.disconnect();
    }

    this.isConnecting = true;
    this.isAdmin = true; // 所有连接都作为管理员，无需认证

    this.socket = io('http://localhost:3001', {
      // 移除所有认证相关代码
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.isConnecting = false;
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.isConnecting = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.isConnecting = false;
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> | null {
    return this.socket;
  }

  isAdminMode(): boolean {
    return this.isAdmin;
  }
}

export const socketManager = new SocketManager();