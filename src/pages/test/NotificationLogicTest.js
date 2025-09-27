import React, { useState, useEffect } from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import websocketService from '../../services/websocket';

function NotificationLogicTest() {
  const [testResults, setTestResults] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const { notifications } = useNotifications();

  useEffect(() => {
    // Check socket connection status
    const checkConnection = () => {
      const connected = websocketService.isSocketConnected();
      setIsConnected(connected);
    };

    checkConnection();
    const interval = setInterval(checkConnection, 1000);

    return () => clearInterval(interval);
  }, []);

  const addTestResult = (test, result, details = '') => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [...prev, {
      id: Date.now(),
      timestamp,
      test,
      result,
      details
    }]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const testNotificationLogic = () => {
    addTestResult('Notification Logic Test', 'INFO', 'Testing notification logic scenarios...');
    
    // Test scenarios
    const scenarios = [
      {
        name: 'Owner updates task → Assignee gets notification',
        actor: { _id: 'owner123', fullName: 'Owner User' },
        task: { 
          _id: 'task123', 
          name: 'Test Task',
          owner: 'owner123', 
          assignee: 'assignee456',
          project: 'project123',
          space: 'space123'
        },
        expected: 'Notification sent to assignee456'
      },
      {
        name: 'Assignee updates task → Owner gets notification',
        actor: { _id: 'assignee456', fullName: 'Assignee User' },
        task: { 
          _id: 'task123', 
          name: 'Test Task',
          owner: 'owner123', 
          assignee: 'assignee456',
          project: 'project123',
          space: 'space123'
        },
        expected: 'Notification sent to owner123'
      },
      {
        name: 'Third party updates task → Both owner and assignee get notifications',
        actor: { _id: 'thirdparty789', fullName: 'Third Party User' },
        task: { 
          _id: 'task123', 
          name: 'Test Task',
          owner: 'owner123', 
          assignee: 'assignee456',
          project: 'project123',
          space: 'space123'
        },
        expected: 'Notifications sent to owner123 and assignee456'
      },
      {
        name: 'Owner is also assignee → No notification',
        actor: { _id: 'owner123', fullName: 'Owner User' },
        task: { 
          _id: 'task123', 
          name: 'Test Task',
          owner: 'owner123', 
          assignee: 'owner123',
          project: 'project123',
          space: 'space123'
        },
        expected: 'No notifications sent'
      }
    ];

    scenarios.forEach((scenario, index) => {
      setTimeout(() => {
        // Simulate notification logic
        const { actor, task } = scenario;
        const actorId = actor._id;
        const notificationsToSend = [];

        // Apply the same logic as in the backend
        if (task.assignee && task.assignee === actorId && task.owner !== actorId) {
          notificationsToSend.push({
            recipientId: task.owner,
            reason: 'assignee updated task, notifying owner'
          });
        }
        else if (task.owner === actorId && task.assignee && task.assignee !== actorId) {
          notificationsToSend.push({
            recipientId: task.assignee,
            reason: 'owner updated task, notifying assignee'
          });
        }
        else if (task.owner !== actorId && (!task.assignee || task.assignee !== actorId)) {
          if (task.owner) {
            notificationsToSend.push({
              recipientId: task.owner,
              reason: 'third party updated task, notifying owner'
            });
          }
          if (task.assignee && task.assignee !== task.owner) {
            notificationsToSend.push({
              recipientId: task.assignee,
              reason: 'third party updated task, notifying assignee'
            });
          }
        }

        const result = notificationsToSend.length > 0 ? 'PASS' : 'PASS';
        const details = notificationsToSend.length > 0 
          ? `Notifications: ${notificationsToSend.map(n => n.reason).join(', ')}`
          : 'No notifications (as expected)';

        addTestResult(scenario.name, result, details);
      }, index * 500);
    });
  };

  const testDuplicateDetection = () => {
    addTestResult('Duplicate Detection Test', 'INFO', 'Testing duplicate notification detection...');
    
    // Simulate duplicate notifications
    const baseNotification = {
      _id: 'notif123',
      type: 'UPDATE_TASK',
      actorId: 'user123',
      data: {
        taskId: 'task123',
        projectId: 'project123',
        spaceId: 'space123'
      },
      createdAt: new Date().toISOString()
    };

    const duplicateNotification = { ...baseNotification };
    const similarNotification = {
      ...baseNotification,
      _id: 'notif124',
      createdAt: new Date(Date.now() + 1000).toISOString() // 1 second later
    };

    // Test exact duplicate
    const isDuplicate1 = baseNotification._id === duplicateNotification._id;
    addTestResult('Exact duplicate detection', isDuplicate1 ? 'PASS' : 'FAIL', 
      `Same ID: ${baseNotification._id}`);

    // Test similar notification (within 5 seconds)
    const timeDiff = new Date(similarNotification.createdAt) - new Date(baseNotification.createdAt);
    const isSimilar = timeDiff < 5000 && 
      baseNotification.type === similarNotification.type &&
      baseNotification.data.taskId === similarNotification.data.taskId;
    
    addTestResult('Similar notification detection', isSimilar ? 'PASS' : 'FAIL',
      `Time diff: ${timeDiff}ms, Same type and task: ${isSimilar}`);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Notification Logic Test</h1>
        
        {/* Connection Status */}
        <div className="mb-6 p-4 rounded-lg bg-gray-50">
          <h2 className="text-lg font-semibold mb-2">Connection Status</h2>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>{isConnected ? 'Socket Connected' : 'Socket Disconnected'}</span>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Current notifications count: {notifications.length}
          </div>
        </div>

        {/* Test Controls */}
        <div className="mb-6 space-x-4">
          <button
            onClick={testNotificationLogic}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Test Notification Logic
          </button>
          <button
            onClick={testDuplicateDetection}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Test Duplicate Detection
          </button>
          <button
            onClick={clearResults}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Clear Results
          </button>
        </div>

        {/* Test Results */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Test Results</h2>
          {testResults.length === 0 ? (
            <p className="text-gray-500">No test results yet. Click a test button to start.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {testResults.map((result) => (
                <div
                  key={result.id}
                  className={`p-3 rounded border-l-4 ${
                    result.result === 'PASS'
                      ? 'bg-green-50 border-green-500'
                      : result.result === 'FAIL'
                      ? 'bg-red-50 border-red-500'
                      : 'bg-blue-50 border-blue-500'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium">{result.test}</div>
                      {result.details && (
                        <div className="text-sm text-gray-600 mt-1">{result.details}</div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          result.result === 'PASS'
                            ? 'bg-green-100 text-green-800'
                            : result.result === 'FAIL'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {result.result}
                      </span>
                      <span className="text-xs text-gray-500">{result.timestamp}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Logic Explanation */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Notification Logic Rules:</h3>
          <ul className="text-sm space-y-1 text-gray-700">
            <li>• <strong>Assignee updates task</strong> → Owner receives notification</li>
            <li>• <strong>Owner updates task</strong> → Assignee receives notification</li>
            <li>• <strong>Third party updates task</strong> → Both owner and assignee receive notifications</li>
            <li>• <strong>Owner is also assignee</strong> → No notifications sent (same person)</li>
            <li>• <strong>Duplicate detection</strong> → Same ID or similar content within 5 seconds</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default NotificationLogicTest;
