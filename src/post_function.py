""" POST Lambda. """
import json
import uuid
from datetime import datetime, timezone
from http import HTTPStatus
from os import environ

import boto3
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler import (APIGatewayRestResolver,
                                                 Response, content_types)
from aws_lambda_powertools.utilities.data_classes import APIGatewayProxyEvent
from aws_lambda_powertools.utilities.typing import LambdaContext
from botocore.exceptions import ClientError

APP_NAME = environ.get("APP_NAME") or "url-shortener POST"
AWS_REGION = environ.get("AWS_REGION") or "us-east-1"
TABLE_NAME = environ.get("TABLE_NAME") or "dev-url-shortner-table"
dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
table = dynamodb.Table(TABLE_NAME)
app = APIGatewayRestResolver()
log: Logger = Logger(service=APP_NAME)
trace: Tracer = Tracer(service=APP_NAME)


def get_current_time() -> str:
    """Get current time in ISO format."""
    return (
        datetime.now(tz=timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


@app.post("/")
@trace.capture_method
def post_item() -> Response:
    """POST an item to DynamoDB table."""
    event_data = app.current_event.json_body

    id = event_data.get("id") or str(uuid.uuid4())[:8]
    url = event_data.get("url")
    created_at = get_current_time()
    if not url:
        return Response(
            status_code=HTTPStatus.BAD_REQUEST.value,
            content_type=content_types.APPLICATION_JSON,
            body=json.dumps({"message": "The 'URL' field is required."}),
        )
    try:
        # check if and item with the same id OR the same url already exists
        if (
            table.get_item(Key={"id": id}).get("Item")
            or table.scan(
                FilterExpression=boto3.dynamodb.conditions.Attr("url").eq(url)
            )["Items"]
        ):
            return Response(
                status_code=HTTPStatus.CONFLICT.value,
                content_type=content_types.APPLICATION_JSON,
                body=json.dumps({"message": "Item already exists."}),
            )

        item = {
            "id": id,
            "url": url,
            "createdAt": created_at,
        }
        table.put_item(Item=item)

        return Response(
            status_code=HTTPStatus.CREATED.value,
            content_type=content_types.APPLICATION_JSON,
            body=None,
        )
    except ClientError as error:
        log.error(error.response["Error"]["Message"])
        return Response(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR.value,
            body=json.dumps({"message": error.response["Error"]["Message"]}),
        )


def lambda_handler(
    event: APIGatewayProxyEvent, context: LambdaContext
) -> dict[str, any]:
    """Lambda handler."""
    return app.resolve(event=event, context=context)
