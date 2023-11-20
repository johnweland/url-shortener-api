""" Unit Tests for DELETE Lambda. """
import json
import os
import sys
from http import HTTPStatus
from unittest import TestCase
from unittest.mock import Mock, patch

import boto3
from aws_lambda_powertools.utilities.data_classes import APIGatewayProxyEvent
from aws_lambda_powertools.utilities.typing import LambdaContext
from botocore.exceptions import ClientError
from moto import mock_dynamodb

sys.path.append(os.path.abspath("."))


@mock_dynamodb
class test_delete_function(TestCase):
    """Test DELETE Lambda."""

    def setUp(self):
        """Setup before each test."""
        super().setUp()
        self.table_name = "dev-url-shortner-table"
        self.dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        self.dynamodb.create_table(
            TableName=self.table_name,
            KeySchema=[
                {"AttributeName": "slug", "KeyType": "HASH"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "slug", "AttributeType": "S"},
            ],
            ProvisionedThroughput={"ReadCapacityUnits": 1, "WriteCapacityUnits": 1},
        )
        self.table = self.dynamodb.Table(self.table_name)
        from src.delete_function import delete_item_by_slug, lambda_handler

        self.lambda_handler = lambda_handler
        self.delete_item_by_slug = delete_item_by_slug
        self.seed_data()

    def seed_data(self):
        table = self.table
        table.put_item(
            Item={
                "slug": "de305d54",
                "targetUrl": "https://www.google.com",
                "createdAt": "2021-01-01T00:00:00.000Z",
            }
        )
        table.put_item(
            Item={
                "slug": "75b4431b",
                "targetUrl": "https://www.example.com",
                "createdAt": "2022-03-08T00:00:00.000Z",
            }
        )

    def test_delete_item_by_slug(self):
        """Test delete_item_by_slug function."""
        event = APIGatewayProxyEvent(
            data={
                "path": "/",
                "httpMethod": "DELETE",
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"slug": "de305d54"}),
            }
        )
        context: LambdaContext = Mock()
        response = self.lambda_handler(event, context)
        self.assertEqual(response["statusCode"], HTTPStatus.NO_CONTENT.value)

    def test_delete_item_by_slug_not_found(self):
        """Test delete_item_by_slug function when the item is NOT FOUND."""
        event = APIGatewayProxyEvent(
            data={
                "path": "/",
                "httpMethod": "DELETE",
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"slug": "123"}),
            }
        )
        context: LambdaContext = Mock()
        response = self.lambda_handler(event, context)
        self.assertEqual(response["statusCode"], HTTPStatus.NOT_FOUND.value)
        self.assertEqual(
            json.loads(response["body"])["message"],
            "Item with a slug of /123 not found.",
        )

    def test_delete_item_by_slug_bad_request(self):
        """Test delete_item_by_slug function when there is a BAD REQUEST."""
        event = APIGatewayProxyEvent(
            data={
                "path": "/",
                "httpMethod": "DELETE",
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"slugs": ""}),
            }
        )
        context: LambdaContext = Mock()
        response = self.lambda_handler(event, context)
        self.assertEqual(response["statusCode"], HTTPStatus.BAD_REQUEST.value)
        self.assertEqual(json.loads(response["body"])["message"], "slug is required.")

    def test_delete_item_by_slug_error(self):
        """Test delete_item_by_slug function when there is an error."""
        context: LambdaContext = Mock()
        event = APIGatewayProxyEvent(
            data={
                "path": "/",
                "httpMethod": "DELETE",
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"slug": "de305d54"}),
            }
        )
        with patch(
            "src.delete_function.table.delete_item",
            side_effect=ClientError(
                error_response={
                    "Error": {"Code": "500", "Message": "Internal Server Error"}
                },
                operation_name="delete_item",
            ),
        ):
            response = self.lambda_handler(event, context)
            self.assertEqual(
                response["statusCode"], HTTPStatus.INTERNAL_SERVER_ERROR.value
            )
            self.assertEqual(
                json.loads(response["body"])["message"], "Internal Server Error"
            )

    def tearDown(self) -> None:
        return super().tearDown()
