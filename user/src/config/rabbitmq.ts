import amqp from 'amqplib';

export let channel: amqp.Channel | null = null;

export const connectRabbitMQ = async () =>{
  try {
    const connection = await amqp.connect({
      protocol:"amqp",
      hostname:process.env.RABBITMQ_HOST,
      port:5672,
      username:process.env.RABBITMQ_USERNAME,
      password:process.env.RABBITMQ_PASSWORD
    });

    channel = await connection.createChannel()
    console.log("✅ connected to RabbitMQ");
    
  } catch (error) {
    console.log("Failed to connect to rabbitmq", error);
    
  }
}

export const publishToQueue = async (queueName:string, message: any) =>{
  if (!channel) {
    console.log("RabbitMQ channel is not initialized");
    return;
    
  }

  await channel.assertQueue(queueName, {durable:true});

  channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), {
    persistent:true,
  })
    console.log(`📨 Message sent to queue "${queueName}":`, message);

}