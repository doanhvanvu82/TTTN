import { io } from 'socket.io-client';

class SocketManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.connectionPromise = null;
    this.connectionStatus = 'disconnected'; // 'disconnected', 'connecting', 'connected', 'error'
    this.pendingUserJoins = []; // Lưu trữ các user cần join sau khi connected
    this.joinedRooms = new Set(); // Lưu trữ các room đã join
    this.joinedTasks = new Set(); // Lưu trữ các task đã join
  }

  connect() {
    // Nếu đã có connection đang hoạt động, trả về ngay
    if (this.socket && this.socket.connected) {
      this.isConnected = true;
      this.connectionStatus = 'connected';
      return Promise.resolve(this.socket);
    }

    // Nếu đang có promise connection đang chạy, trả về promise đó
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // Tạo connection mới
    this.connectionStatus = 'connecting';
    this.connectionPromise = new Promise((resolve, reject) => {
      // Đóng connection cũ nếu có
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }

      this.socket = io('/', {
        path: '/socket.io',
        withCredentials: true,
        transports: ['websocket', 'polling'],
        forceNew: false // Đảm bảo tái sử dụng connection nếu có thể
      });

      this.socket.on('connect', () => {
        console.log('Connected to Socket.IO server:', this.socket.id);
        this.isConnected = true;
        this.connectionStatus = 'connected';
        this.connectionPromise = null;
        
        // Join tất cả pending users sau khi connected
        this.processPendingUserJoins();
        
        // Rejoin tất cả các room đã join trước đó (reconnection)
        this.rejoinAllRooms();
        
        resolve(this.socket);
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from Socket.IO server');
        this.isConnected = false;
        this.connectionStatus = 'disconnected';
        this.connectionPromise = null;
        // Không clear pending joins khi disconnect, để có thể join lại khi reconnect
        console.log('Disconnected - keeping pending joins for reconnection');
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error);
        this.isConnected = false;
        this.connectionStatus = 'error';
        this.connectionPromise = null;
        // Clear pending joins khi có lỗi
        this.pendingUserJoins = [];
        reject(error);
      });

      // Timeout để tránh promise pending mãi mãi
      setTimeout(() => {
        if (this.connectionPromise) {
          this.connectionStatus = 'error';
          this.connectionPromise = null;
          this.pendingUserJoins = [];
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });

    return this.connectionPromise;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.connectionStatus = 'disconnected';
      this.connectionPromise = null;
      // Không clear pendingUserJoins và joinedRooms để có thể rejoin khi reconnect
      console.log('Disconnected - keeping room information for reconnection');
    }
  }

  forceReconnect() {
    // Force disconnect và tạo connection mới
    this.disconnect();
    return this.connect();
  }

  // Clear tất cả room information khi logout
  clearAllRooms() {
    this.pendingUserJoins = [];
    this.joinedRooms.clear();
    this.joinedTasks.clear();
    console.log('Cleared all room information (logout)');
  }

  getConnectionStatus() {
    return this.connectionStatus;
  }

  // Process pending user joins sau khi connected
  processPendingUserJoins() {
    if (this.socket && this.socket.connected && this.pendingUserJoins.length > 0) {
      console.log('Processing pending user joins:', this.pendingUserJoins);
      this.pendingUserJoins.forEach(userId => {
        this.socket.emit('join-user', userId);
        this.joinedRooms.add(`user-${userId}`);
        console.log(`User ${this.socket.id} joined user room user-${userId} (from pending)`);
      });
      this.pendingUserJoins = [];
    }
  }

  // Rejoin tất cả các room đã join trước đó
  rejoinAllRooms() {
    if (this.socket && this.socket.connected) {
      console.log('Rejoining all previously joined rooms...');
      
      // Rejoin user rooms
      this.joinedRooms.forEach(room => {
        if (room.startsWith('user-')) {
          const userId = room.replace('user-', '');
          this.socket.emit('join-user', userId);
          console.log(`Rejoined user room: ${room}`);
        }
      });

      // Rejoin task rooms
      this.joinedTasks.forEach(taskId => {
        this.socket.emit('join-task', taskId);
        console.log(`Rejoined task room: task-${taskId}`);
      });
    }
  }

  joinTask(taskId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('join-task', taskId);
      this.joinedTasks.add(taskId);
      console.log(`Joined task room: task-${taskId}`);
    }
  }
  
  leaveTask(taskId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave-task', taskId);
      this.joinedTasks.delete(taskId);
      console.log(`Left task room: task-${taskId}`);
    }
  }

  joinUser(userId) {
    if (this.socket && this.socket.connected) {
      // Nếu đã connected, join ngay lập tức
      this.socket.emit('join-user', userId);
      this.joinedRooms.add(`user-${userId}`);
      console.log(`User ${this.socket.id} joined user room user-${userId} (immediate)`);
    } else {
      // Nếu chưa connected, thêm vào pending list
      if (!this.pendingUserJoins.includes(userId)) {
        this.pendingUserJoins.push(userId);
        console.log(`User ${userId} added to pending joins list`);
      }
    }
  }

  leaveUser(userId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave-user', userId);
      this.joinedRooms.delete(`user-${userId}`);
      console.log(`Left user room: user-${userId}`);
    }
    // Remove khỏi pending list nếu có
    this.pendingUserJoins = this.pendingUserJoins.filter(id => id !== userId);
  }

  // Kiểm tra xem user đã join room chưa
  isUserInRoom(userId) {
    return this.pendingUserJoins.includes(userId);
  }

  // Helper method để emit events an toàn
  emit(event, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    }
  }

  // --- Task events ---
  onTaskUpdated(callback) {
    if (this.socket) this.socket.on('task-updated', callback);
  }
  offTaskUpdated() {
    if (this.socket) this.socket.off('task-updated');
  }
  onTaskUpdatedGlobal(callback) {
    if (this.socket) this.socket.on('task-updated-global', callback);
  }
  offTaskUpdatedGlobal() {
    if (this.socket) this.socket.off('task-updated-global');
  }
  onTaskStageChanged(callback) {
    if (this.socket) this.socket.on('task-stage-changed', callback);
  }
  offTaskStageChanged() {
    if (this.socket) this.socket.off('task-stage-changed');
  }
  onTaskStageChangedGlobal(callback) {
    if (this.socket) this.socket.on('task-stage-changed-global', callback);
  }
  offTaskStageChangedGlobal() {
    if (this.socket) this.socket.off('task-stage-changed-global');
  }
  onTaskUpdatedTeam(callback) {
    if (this.socket) this.socket.on('task-updated-team', callback);
  }
  offTaskUpdatedTeam() {
    if (this.socket) this.socket.off('task-updated-team');
  }
  onTaskDeleted(callback) {
    if (this.socket) this.socket.on('task-deleted', callback);
  }
  offTaskDeleted() {
    if (this.socket) this.socket.off('task-deleted');
  }
  onTaskAddedGlobal(callback) {
    if (this.socket) {
      this.socket.on('task-added-global', (data) => {
        console.log('📡 Received task-added-global event:', data);
        callback(data);
      });
    }
  }
  offTaskAddedGlobal() {
    if (this.socket) this.socket.off('task-added-global');
  }

  // --- Subtask events ---
  onSubtaskAdded(callback) {
    if (this.socket) this.socket.on('subtask-added', callback);
  }
  offSubtaskAdded() {
    if (this.socket) this.socket.off('subtask-added');
  }
  onSubtaskUpdated(callback) {
    if (this.socket) this.socket.on('subtask-updated', callback);
  }
  offSubtaskUpdated() {
    if (this.socket) this.socket.off('subtask-updated');
  }
  onSubtaskDeleted(callback) {
    if (this.socket) this.socket.on('subtask-deleted', callback);
  }
  offSubtaskDeleted() {
    if (this.socket) this.socket.off('subtask-deleted');
  }

  // --- Subtask global events ---
  onSubtaskAddedGlobal(callback) {
    if (this.socket) this.socket.on('subtask-added-global', callback);
  }
  offSubtaskAddedGlobal() {
    if (this.socket) this.socket.off('subtask-added-global');
  }
  onSubtaskUpdatedGlobal(callback) {
    if (this.socket) this.socket.on('subtask-updated-global', callback);
  }
  offSubtaskUpdatedGlobal() {
    if (this.socket) this.socket.off('subtask-updated-global');
  }
  onSubtaskDeletedGlobal(callback) {
    if (this.socket) this.socket.on('subtask-deleted-global', callback);
  }
  offSubtaskDeletedGlobal() {
    if (this.socket) this.socket.off('subtask-deleted-global');
  }

  // --- Reminder events ---
  onReminderAdded(callback) {
    if (this.socket) this.socket.on('reminder-added', callback);
  }
  offReminderAdded() {
    if (this.socket) this.socket.off('reminder-added');
  }
  onReminderDeleted(callback) {
    if (this.socket) this.socket.on('reminder-deleted', callback);
  }
  offReminderDeleted() {
    if (this.socket) this.socket.off('reminder-deleted');
  }
  onReminderSent(callback) {
    if (this.socket) this.socket.on('reminder-sent', callback);
  }
  offReminderSent() {
    if (this.socket) this.socket.off('reminder-sent');
  }

  // --- Notification events ---
  onNotificationNew(callback) {
    if (this.socket) this.socket.on('notification-new', callback);
  }
  offNotificationNew() {
    if (this.socket) this.socket.off('notification-new');
  }
  onNotificationDeleted(callback) {
    if (this.socket) this.socket.on('notification-deleted', callback);
  }
  offNotificationDeleted() {
    if (this.socket) this.socket.off('notification-deleted');
  }
  onNotificationRead(callback) {
    if (this.socket) this.socket.on('notification-read', callback);
  }
  offNotificationRead() {
    if (this.socket) this.socket.off('notification-read');
  }

  // --- Activity events ---
  onActivityAdded(callback) {
    if (this.socket) this.socket.on('activity-added', callback);
  }
  offActivityAdded() {
    if (this.socket) this.socket.off('activity-added');
  }
  onActivityDeleted(callback) {
    if (this.socket) this.socket.on('activity-deleted', callback);
  }
  offActivityDeleted() {
    if (this.socket) this.socket.off('activity-deleted');
  }

  // --- Comment events (giữ nguyên) ---
  onNewComment(callback) {
    if (this.socket) {
      this.socket.on('new-comment', callback);
    }
  }
  onCommentUpdated(callback) {
    if (this.socket) {
      this.socket.on('comment-updated', callback);
    }
  }
  onCommentDeleted(callback) {
    if (this.socket) {
      this.socket.on('comment-deleted', callback);
    }
  }
  offNewComment() {
    if (this.socket) {
      this.socket.off('new-comment');
    }
  }
  offCommentUpdated() {
    if (this.socket) {
      this.socket.off('comment-updated');
    }
  }
  offCommentDeleted() {
    if (this.socket) {
      this.socket.off('comment-deleted');
    }
  }

  getSocket() {
    return this.socket;
  }
  
  isSocketConnected() {
    return this.socket && this.socket.connected;
  }
}

const socketManager = new SocketManager();
export default socketManager; 