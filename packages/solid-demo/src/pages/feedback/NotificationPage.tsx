import { type Component } from "solid-js";
import { useNotification, Button } from "@simplysm/solid";

const NotificationDemo: Component = () => {
  const notification = useNotification();

  return (
    <div class="space-y-8">
      {/* Theme-specific notification test */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Theme-specific Notifications</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          Click each button to trigger a notification with that theme. You can see them in the top banner and bell icon in the top right.
        </p>
        <div class="flex flex-wrap gap-2">
          <Button
            theme="info"
            variant="solid"
            onClick={() => notification.info("Info", "This is a general information notification.")}
          >
            Info Notification
          </Button>
          <Button
            theme="success"
            variant="solid"
            onClick={() => notification.success("Success", "The operation has been completed.")}
          >
            Success Notification
          </Button>
          <Button
            theme="warning"
            variant="solid"
            onClick={() => notification.warning("Warning", "Attention is required.")}
          >
            Warning Notification
          </Button>
          <Button
            theme="danger"
            variant="solid"
            onClick={() => notification.danger("Error", "An error has occurred.")}
          >
            Danger Notification
          </Button>
        </div>
      </section>

      {/* Notification with action button */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">With Action Button</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          Notifications can include an action button. Try clicking the button in the banner.
        </p>
        <Button
          theme="primary"
          variant="solid"
          onClick={() =>
            notification.info("File Upload", "file.png upload has been completed.", {
              action: {
                label: "View",
                onClick: () => alert("View file clicked!"),
              },
            })
          }
        >
          Notification With Action
        </Button>
      </section>

      {/* Multiple notifications */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Multiple Notifications</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          Trigger multiple notifications in sequence. Click the bell icon to see all notifications.
        </p>
        <Button
          theme="base"
          variant="outline"
          onClick={() => {
            notification.info("1st Notification", "This is the first notification.");
            setTimeout(() => notification.success("2nd Notification", "This is the second notification."), 100);
            setTimeout(() => notification.warning("3rd Notification", "This is the third notification."), 200);
          }}
        >
          Trigger 3 Consecutive Notifications
        </Button>
      </section>

      {/* Clear all */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Notification Management</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">Clear all notifications.</p>
        <Button theme="danger" variant="outline" onClick={() => notification.clear()}>
          Clear All Notifications
        </Button>
      </section>
    </div>
  );
};

export default function NotificationPage() {
  return (
    <div class="space-y-8 p-6">
      <NotificationDemo />
    </div>
  );
}
